function testDatabaseConfig(env) {
  if (env.RUN_DATABASE_TESTS !== 'yes' || env.TEST_DB_CONFIRMED !== 'yes') throw new Error('Database integration disabled; explicit isolated-test confirmation required');
  const parse = value => {
    let url;
    try { url = new URL(value); } catch { throw new Error('Missing test database URL'); }
    const database = decodeURIComponent(url.pathname.slice(1));
    if (url.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !/^recipe_test_[a-z0-9_]+$/i.test(database) || url.search || url.hash) throw new Error('Only explicit loopback recipe_test_* databases are permitted');
    return { url: url.href, host: url.hostname, port: url.port || '3306', database,
      user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) };
  };
  return { prisma: parse(env.TEST_DATABASE_URL), sessions: parse(env.TEST_SESSION_DATABASE_URL) };
}
module.exports = { testDatabaseConfig };
