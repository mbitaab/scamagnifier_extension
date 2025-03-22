const mongoDb = require('mongoose')
mongoDb.Promise = global.Promise;

let database = function () {
    let mdb = null;

    function database_connect() {
        try {
            let db_uri;
            const mongo_username = process.env.MONGO_USERNAME || "mongoadmin"
            const mongo_password = process.env.MONGO_PASSWORD || "secret"
            const mongo_host = process.env.MONGO_HOSTNAME || "mongodb"
            const mongo_port = process.env.MONGO_PORT || "27017"
            const mongo_db = process.env.MONGO_DB || "scamagnifier"
            
            db_uri = `mongodb://${mongo_username}:${mongo_password}@${mongo_host}:${mongo_port}/${mongo_db}?authSource=${mongo_db}`
            console.log(`[*]connection : ${db_uri}`)
            mongoDb.connect(db_uri)
            .then(() => console.log('MongoDB connected successfully'))
            .catch(err => console.error('MongoDB connection error:', err));          
            mdb = mongoDb.connection;
            mdb.on('error', console.error.bind(console, 'connection error:'));
            mdb.once('open', function callback() {
                console.log("database opened ...");
            });
            return mdb
        } catch (e) {
            console.log("database_connect ..." + e);
            return e;
        }
    }


    function get() {
        try {
            if (mdb != null) {
                return mdb;
            } else {
                mdb = new database_connect();
                return mdb;
            }
        } catch (e) {
            console.log("return error " + e)
            return e;
        }
    }

    return {
        get: get
    }
}
module.exports = database();