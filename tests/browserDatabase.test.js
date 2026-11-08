const test=require('node:test');
const assert=require('node:assert/strict');
const {testDatabaseConfig}=require('./helpers/testDatabase.cjs');

test('React Express MySQL real browser journeys',{skip:process.env.RUN_BROWSER_DATABASE_TESTS!=='yes',timeout:120000},async t=>{
 const config=testDatabaseConfig(process.env);
 for(const field of ['host','port','database'])assert.equal(config.prisma[field],config.sessions[field],'Browser counts require the same isolated schema for Prisma and sessions');
 process.env.DATABASE_URL=config.prisma.url;
 Object.assign(process.env,{DB_HOST:config.sessions.host,DB_PORT:config.sessions.port,DB_NAME:config.sessions.database,DB_USER:config.sessions.user,DB_PASSWORD:config.sessions.password,NODE_ENV:'test',SESSION_SECRET:'browser-isolated-session-only',APP_ORIGIN:'',TRUST_PROXY:'',EMAIL_USER:'',EMAIL_APP_PASSWORD:'',GEMINI_API_KEY:''});
 const prisma=require('../config/prisma'),bcrypt=require('bcrypt'),{chromium,expect}=require('@playwright/test');
 let app,server,browser,category,admin,member,otherMember,recipeId,base,initialCounts;
 const models=['users','recipes','categories','ingredients','steps','comments','ratings','favorites','recipe_media','recipe_views','recipe_tags','tags','user_tag_votes','sessions'];
 const counts=async()=>Object.fromEntries(await Promise.all(models.map(async model=>[model,await prisma[model].count()])));
 const password='Fixture-Only!123',username='browser_member_fixture',title='Trứng tỏi E2E fixture',pageErrors=[];
 try{
  assert.equal((await prisma.$queryRaw`SELECT DATABASE() name`)[0].name,config.prisma.database);
  assert.equal(await prisma.users.count(),0);assert.equal(await prisma.recipes.count(),0);assert.equal(await prisma.sessions.count(),0);
  initialCounts=await counts();
  admin=await prisma.users.create({data:{username:'browser_admin_fixture',email:'browser_admin@example.invalid',fullname:'Browser Admin Fixture',role:'admin',password:await bcrypt.hash(password,4),is_banned:false}});
  category=await prisma.categories.create({data:{name:'Danh mục E2E fixture'}});
  app=require('../app');server=require('node:http').createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({baseURL:base,viewport:{width:1440,height:900}});
  const adminContext=await browser.newContext({baseURL:base});
  // Do not fake a single app/API response. Disallow external services/CDNs only.
  for(const c of [context,adminContext])await c.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===base||['fonts.googleapis.com','fonts.gstatic.com','cdnjs.cloudflare.com'].includes(url.hostname)?route.continue():route.abort();});
  const page=await context.newPage(),adminPage=await adminContext.newPage();
  for(const p of [page,adminPage]){p.on('pageerror',e=>pageErrors.push(e.message));p.setDefaultTimeout(10000);}
  const login=async(p,name)=>{await p.goto('/login');await p.getByLabel('Tên tài khoản').fill(name);await p.getByLabel('Mật khẩu',{exact:true}).fill(password);const wait=p.waitForResponse(r=>r.url().endsWith('/api/login')&&r.request().method()==='POST');await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();assert.equal((await wait).status(),200);await p.waitForURL(base+'/');};
  await t.test('registration persists hashed account and duplicate submission is rejected',async()=>{
   await page.goto('/register');await page.getByLabel('Tên đăng nhập',{exact:true}).fill(username);await page.getByLabel('Họ và tên').fill('Browser Member Fixture');await page.getByLabel('Địa chỉ email').fill('browser_member@example.invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Xác nhận mật khẩu',{exact:true}).fill(password);
   const wait=page.waitForResponse(r=>r.url().endsWith('/api/register')&&r.request().method()==='POST');await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();assert.equal((await wait).status(),200);
   await expect(page.getByText('Đăng ký thành công! Vui lòng đăng nhập.')).toBeVisible();member=await prisma.users.findUnique({where:{username}});assert.ok(member);assert.notEqual(member.password,password);assert.equal(await bcrypt.compare(password,member.password),true);
   const duplicate=await context.request.post('/api/register',{data:{username,fullname:'Fixture',email:'browser_member@example.invalid',password,confirm_password:password}});assert.equal(duplicate.status(),400);assert.equal(await prisma.users.count({where:{username}}),1);await page.waitForURL('**/login');
  });
  await t.test('login establishes real session and role gates work in API and UI',async()=>{
   await login(page,username);assert.ok(await prisma.sessions.count()>0);assert.equal((await context.request.get('/api/profile')).status(),200);assert.equal((await context.request.get('/api/admin/users')).status(),403);
   await page.goto('/admin/users');await page.waitForURL(base+'/');await login(adminPage,admin.username);assert.equal((await adminContext.request.get('/api/admin/users')).status(),200);
  });
  await t.test('create recipe through React writes recipe/ingredients/steps atomically',async()=>{
   await page.goto('/recipes/create');await page.locator('#create-title').fill(title);await page.locator('#create-category').selectOption(String(category.id));await page.locator('#create-description').fill('Real browser integration fixture');await page.locator('#create-prep-time').fill('5');await page.locator('#create-cook-time').fill('5');await page.getByLabel('Tên nguyên liệu 1',{exact:true}).fill('Trứng');await page.getByLabel('Số lượng nguyên liệu 1',{exact:true}).fill('1');await page.getByLabel('Đơn vị nguyên liệu 1',{exact:true}).fill('quả');await page.getByLabel('Nội dung bước 1',{exact:true}).fill('Chiên trứng với tỏi');
   const wait=page.waitForResponse(r=>r.url().endsWith('/api/recipes/create')&&r.request().method()==='POST');await page.locator('button[type="submit"]').click();const response=await wait;assert.equal(response.status(),201);recipeId=(await response.json()).recipeId;await page.waitForURL('**/recipes/'+recipeId);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();assert.equal((await prisma.recipes.findUnique({where:{id:recipeId}})).user_id,member.id);assert.equal(await prisma.ingredients.count({where:{recipe_id:recipeId}}),1);assert.equal(await prisma.steps.count({where:{recipe_id:recipeId}}),1);
  });
  await t.test('search/filter/pagination agree with actual API and database',async()=>{
   await page.goto('/recipes?search='+encodeURIComponent(title)+'&category='+category.id+'&page=1');await expect(page.getByText(title,{exact:true}).first()).toBeVisible();const response=await context.request.get('/api/recipes?search='+encodeURIComponent(title)+'&category='+category.id+'&page=1&limit=1');assert.equal(response.status(),200);const data=await response.json();assert.equal(data.total,1);assert.equal(data.recipes[0].id,recipeId);assert.equal(await prisma.recipes.count({where:{title}}),1);
  });
  await t.test('favorite/comment/rating from UI survive reload and persist in MySQL',async()=>{
   await page.goto('/recipes/'+recipeId);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
   const [fav]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/favorite')&&r.request().method()==='POST'),page.locator('button.nyt-btn-save').filter({hasText:'Lưu'}).first().click()]);assert.equal(fav.status(),200);assert.equal(await prisma.favorites.count({where:{user_id:member.id,recipe_id:recipeId}}),1);
   await page.getByPlaceholder('Để lại bình luận của bạn...').fill('Bình luận E2E thật');const comment=page.waitForResponse(r=>r.url().endsWith('/comments')&&r.request().method()==='POST');await page.getByRole('button',{name:'Gửi bình luận',exact:true}).click();assert.equal((await comment).status(),200);assert.equal(await prisma.comments.count({where:{recipe_id:recipeId,content:'Bình luận E2E thật'}}),1);
   const [rated]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/rate')&&r.request().method()==='POST'),page.getByRole('heading',{name:'Đánh giá của bạn',exact:true}).locator('..').locator('i.fa-star').last().click()]);assert.equal(rated.status(),200);assert.equal((await prisma.ratings.findFirst({where:{user_id:member.id,recipe_id:recipeId}})).star_count,5);
   await page.reload();await expect(page.getByText('Bình luận E2E thật',{exact:true})).toBeVisible();await expect(page.locator('button.nyt-btn-saved')).toBeVisible();
  });
  await t.test('admin ban/unban persists and invalidates member session on next API request',async()=>{
   await adminPage.goto('/admin/users');const button=adminPage.getByRole('button',{name:'Khóa tài khoản của '+username,exact:true});await button.click();const ban=adminPage.waitForResponse(r=>r.url().includes('/users/ban/')&&r.request().method()==='POST');await adminPage.getByRole('dialog').getByRole('button',{name:'Khóa',exact:true}).click();assert.equal((await ban).status(),200);assert.equal((await prisma.users.findUnique({where:{id:member.id}})).is_banned,true);assert.equal((await context.request.get('/api/profile')).status(),403);
   await adminPage.getByRole('button',{name:'Mở khóa tài khoản của '+username,exact:true}).click();const unban=adminPage.waitForResponse(r=>r.url().includes('/users/ban/')&&r.request().method()==='POST');await adminPage.getByRole('dialog').getByRole('button',{name:'Mở khóa',exact:true}).click();assert.equal((await unban).status(),200);assert.equal((await prisma.users.findUnique({where:{id:member.id}})).is_banned,false);await login(page,username);
  });
  await t.test('non-owner cannot delete; author delete cascades and logout revokes session',async()=>{
   const outsider=await browser.newContext({baseURL:base});assert.equal((await outsider.request.delete('/api/recipes/'+recipeId)).status(),401);
   const registered=await outsider.request.post('/api/register',{data:{username:'browser_other_fixture',fullname:'Other Fixture',email:'browser_other@example.invalid',password,confirm_password:password}});assert.equal(registered.status(),200);
   const other=otherMember=(await prisma.users.findUnique({where:{username:'browser_other_fixture'}}));
   assert.equal((await outsider.request.post('/api/login',{data:{username:other.username,password}})).status(),200);assert.equal((await outsider.request.delete('/api/recipes/'+recipeId)).status(),403);assert.equal(await prisma.recipes.count({where:{id:recipeId}}),1);
   await outsider.request.post('/api/logout');await outsider.close();await prisma.users.delete({where:{id:other.id}});
   await page.goto('/recipes/'+recipeId);await page.getByRole('button',{name:'Xoá công thức',exact:true}).click();const deleted=page.waitForResponse(r=>r.url().endsWith('/api/recipes/'+recipeId)&&r.request().method()==='DELETE');await page.getByRole('dialog').getByRole('button',{name:'Xoá',exact:true}).click();assert.equal((await deleted).status(),200);assert.equal(await prisma.recipes.count({where:{id:recipeId}}),0);for(const model of ['ingredients','steps','comments','ratings','favorites'])assert.equal(await prisma[model].count({where:{recipe_id:recipeId}}),0);
   await context.request.post('/api/logout');assert.equal((await context.request.get('/api/profile')).status(),401);await page.goto('/recipes/create');await page.waitForURL('**/login');assert.deepEqual(pageErrors,[]);
  });
 }finally{
  if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  // The schema was asserted empty; still delete only owned fixture IDs.
  const ids=[admin?.id,member?.id,otherMember?.id].filter(Boolean);
  if(ids.length){await prisma.recipes.deleteMany({where:{user_id:{in:ids}}});await prisma.users.deleteMany({where:{id:{in:ids}}});}
  if(category)await prisma.categories.delete({where:{id:category.id}});
  if(app){await prisma.sessions.deleteMany();if(initialCounts)assert.deepEqual(await counts(),initialCounts);await app.locals.closeResources();}else await prisma.$disconnect();
 }
});
