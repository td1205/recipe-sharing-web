const test=require('node:test');
const assert=require('node:assert/strict');
const {testDatabaseConfig}=require('./helpers/testDatabase.cjs');

test('real MySQL constraints, rollback, concurrency and session persistence',{skip:process.env.RUN_DATABASE_TESTS!=='yes',timeout:60000},async t=>{
 const config=testDatabaseConfig(process.env),mysql=require('mysql2/promise');
 for(const field of ['host','port','database'])assert.equal(config.prisma[field],config.sessions[field],'Constraint counts require the same isolated schema for Prisma and sessions');
 process.env.DATABASE_URL=config.prisma.url;
 Object.assign(process.env,{DB_HOST:config.sessions.host,DB_PORT:config.sessions.port,DB_NAME:config.sessions.database,DB_USER:config.sessions.user,DB_PASSWORD:config.sessions.password,SESSION_SECRET:'isolated-constraint-test-only'});
 const prisma=require('../config/prisma');let sql,category,recipe;const users=[];
 try{
  sql=await mysql.createConnection(config.prisma.url);
  assert.equal((await sql.query('SELECT DATABASE() name'))[0][0].name,config.prisma.database);
  assert.equal(await prisma.users.count(),0);assert.equal(await prisma.recipes.count(),0);
  const tables=['users','recipes','categories','course_types','meal_times','ingredients','steps','comments','ratings','favorites','recipe_media','recipe_views','recipe_tags','tags','user_tag_votes','sessions'];
  const counts=async()=>Object.fromEntries(await Promise.all(tables.map(async name=>[name,Number((await sql.query('SELECT COUNT(*) n FROM `'+name+'`'))[0][0].n)])));
  const initial=await counts();
  const userData=n=>({username:'constraint_'+n,email:'constraint_'+n+'@example.invalid',password:'synthetic-not-a-login-password',role:'user',is_banned:false});
  for(let n=0;n<4;n++)users.push(await prisma.users.create({data:{...userData(n),role:n>=2?'admin':'user'}}));
  category=await prisma.categories.create({data:{name:'Constraint fixture'}});
  const recipeData={user_id:users[0].id,category_id:category.id,title:'Constraint fixture',prep_time:1,cook_time:1,servings:1};
  recipe=await prisma.recipes.create({data:recipeData});
  await t.test('baseline history exists and CHECK is enforced',async()=>{
   const [history]=await sql.query("SELECT migration_name,finished_at,rolled_back_at FROM _prisma_migrations WHERE migration_name='0_baseline'");
   assert.equal(history.length,1);assert.ok(history[0].finished_at);assert.equal(history[0].rolled_back_at,null);
   for(const star of [0,6])await assert.rejects(sql.execute('INSERT INTO ratings(user_id,recipe_id,star_count) VALUES(?,?,?)',[users[1].id,recipe.id,star]),e=>e.errno===3819);
   assert.equal(await prisma.ratings.count(),0);
  });
  await t.test('foreign key rejects orphan recipe without partial row',async()=>{
   const before=await prisma.recipes.count();
   await assert.rejects(prisma.recipes.create({data:{...recipeData,user_id:2147483647}}),e=>e.code==='P2003');assert.equal(await prisma.recipes.count(),before);
  });
  await t.test('RESTRICT protects recipe owner/category at SQL and repository levels',async()=>{
   await assert.rejects(prisma.users.delete({where:{id:users[0].id}}),e=>e.code==='P2003');
   await assert.rejects(prisma.categories.delete({where:{id:category.id}}),e=>e.code==='P2003');
   await assert.rejects(require('../repositories/adminRepository').deleteUser(users[0].id,users[2].id),e=>e.status===400);
   await assert.rejects(require('../repositories/categoryRepository').remove(category.id),e=>e.status===400);
   assert.ok(await prisma.recipes.findUnique({where:{id:recipe.id}}));
  });
  await t.test('UNIQUE rejects duplicate username/email and recipe step order',async()=>{
   await assert.rejects(prisma.users.create({data:{...userData('duplicate'),username:users[0].username}}),e=>e.code==='P2002');
   await assert.rejects(prisma.users.create({data:{...userData('duplicate'),email:users[0].email}}),e=>e.code==='P2002');
   await prisma.steps.create({data:{recipe_id:recipe.id,step_number:1,instruction:'Fixture step'}});
   await assert.rejects(prisma.steps.create({data:{recipe_id:recipe.id,step_number:1,instruction:'Duplicate'}}),e=>e.code==='P2002');
   assert.equal(await prisma.steps.count(),1);
  });
  await t.test('real transaction rollback restores recipe and child counts',async()=>{
   const before=await counts();
   await assert.rejects(prisma.$transaction(async tx=>{
    const row=await tx.recipes.create({data:recipeData});
    await tx.ingredients.create({data:{recipe_id:row.id,name:'Rollback fixture'}});
    throw new Error('Deliberate rollback after real writes');
   }),/Deliberate rollback/);
   assert.deepEqual(await counts(),before);
  });
  await t.test('concurrent rating upserts and desired favorites remain unique',async()=>{
   const rating=require('../repositories/ratingRepository'),fav=require('../repositories/favoriteRepository');
   await Promise.all(Array.from({length:8},(_,n)=>rating.createOrUpdateRating(users[1].id,recipe.id,n%5+1)));
   assert.equal(await prisma.ratings.count({where:{recipe_id:recipe.id}}),1);
   await Promise.all(Array.from({length:8},()=>fav.setFavorite(users[1].id,recipe.id,true)));
   assert.equal(await prisma.favorites.count({where:{recipe_id:recipe.id}}),1);
   await assert.rejects(prisma.favorites.create({data:{user_id:users[1].id,recipe_id:recipe.id}}),e=>e.code==='P2002');
  });
  await t.test('concurrent views deduplicate, author view is not counted',async()=>{
   const repo=require('../repositories/recipeViewRepository');
   await Promise.all(Array.from({length:6},()=>repo.recordQualifiedView(recipe.id,users[1].id,'fixture-session')));
   assert.equal(await prisma.recipe_views.count({where:{recipe_id:recipe.id}}),1);
   assert.equal((await repo.recordQualifiedView(recipe.id,users[0].id,'owner-session')).counted,false);
   assert.equal(await prisma.recipe_views.count(),1);
  });
  await t.test('competing admin delete/ban cannot remove the last active admin',async()=>{
   const repo=require('../repositories/adminRepository');
   const attempts=await Promise.allSettled([repo.deleteUser(users[2].id,users[2].id),repo.banUser(users[3].id,true,users[3].id)]);
   assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(await prisma.users.count({where:{role:'admin',is_banned:false}}),1);
  });
  await t.test('session store writes, reads and revokes actual MySQL session',async()=>{
   const store=require('../config/sessionStore').getSessionStore(),sid='constraint-test-session';
   await store.set(sid,{cookie:{expires:new Date(Date.now()+60000)},user:{id:users[0].id}});
   assert.equal((await store.get(sid)).user.id,users[0].id);
   assert.equal((await sql.query('SELECT COUNT(*) n FROM sessions WHERE session_id=?',[sid]))[0][0].n,1);
   await store.destroy(sid);assert.equal(await store.get(sid),null);
  });
  await t.test('recipe cascade removes child rows while preserving users/category',async()=>{
   await prisma.ingredients.create({data:{recipe_id:recipe.id,name:'Fixture egg'}});
   await prisma.comments.create({data:{recipe_id:recipe.id,user_id:users[1].id,content:'Fixture comment'}});
   await prisma.recipe_media.create({data:{recipe_id:recipe.id,media_url:'https://example.invalid/fixture.jpg'}});
   await prisma.recipes.delete({where:{id:recipe.id}});recipe=null;
   for(const name of ['ingredients','steps','comments','ratings','favorites','recipe_media','recipe_views'])assert.equal(Number((await sql.query('SELECT COUNT(*) n FROM `'+name+'`'))[0][0].n),0);
   assert.ok(await prisma.users.findUnique({where:{id:users[0].id}}));assert.ok(await prisma.categories.findUnique({where:{id:category.id}}));
  });
  await t.test('fixture cleanup returns every application table to initial counts',async()=>{
   await prisma.users.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await prisma.categories.delete({where:{id:category.id}});category=null;
   assert.deepEqual(await counts(),initial);
  });
 }finally{
  if(users.length){await prisma.recipes.deleteMany({where:{user_id:{in:users.map(u=>u.id)}}});await prisma.users.deleteMany({where:{id:{in:users.map(u=>u.id)}}});}
  if(category)await prisma.categories.delete({where:{id:category.id}});
  await require('../config/sessionStore').closeSessionStore();await prisma.$disconnect();if(sql)await sql.end();
 }
});
