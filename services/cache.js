const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");
const keys = require("../config/keys");

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec; //vogliamo riscrivere la funzione di mongoose per fare un check della query prima che venga eseguita

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true; // questo this si riferisce all'istanza della query al momento in cui viene generata
  this.hashKey = JSON.stringify(options.key || "");

  return this; // ritornando this la funzione useCache diventa concatenabile ad altre
};

mongoose.Query.prototype.exec = async function() {
  //non usiamo una arrow function perchè all'interno della funzione "this" deve riferirsi a "Query"
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  //Object.assign safely copy properties from one object to another one passed as first argument
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );

  // See if we have a vaue for 'key' in redis
  const cacheValue = await client.hget(this.hashKey, key);
  // If we do, return that
  if (cacheValue) {
    //const doc = new this.model(JSON.parse(cacheValue)); //stessa cosa di "new Blog({title: 'Hi", content: 'there'})

    const doc = JSON.parse(cacheValue);

    return Array.isArray(doc) ? doc.map(d => new this.model(d)) : new this.model(doc);
  }
  // Otherwise, issue the query and store the result in redis

  const result = await exec.apply(this, arguments); // qui esegue la funzione exec originale -- result is the actual mongoose document instance -- in order to store it in redis we have to turn it into json

  client.hset(this.hashKey, key, JSON.stringify(result));
  client.expire(this.hashKey, 10);

  return result;
};

// funzione per svuotare la cache per una certa chiave
module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};
