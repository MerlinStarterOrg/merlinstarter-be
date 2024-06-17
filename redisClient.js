import redis from 'redis';

const client = redis.createClient({url:"redis://127.0.0.1:6379"});

client.on('error', (err) => console.log('Redis Client Error', err));

await client.connect();

export { client };
