const db = require('../config/db');

const notifyUser = async (userId, message) => {
    await db.query("INSERT INTO notifications (user_id, message) VALUES ($1, $2)", [userId, message]);
};

const notifyAll = async (messageOrBuilder) => {
    const users = await db.query("SELECT id, full_name FROM users");
    const queries = users.rows.map(u => {
        const finalMessage = typeof messageOrBuilder === 'function' 
            ? messageOrBuilder(u) 
            : messageOrBuilder;
        return db.query("INSERT INTO notifications (user_id, message) VALUES ($1, $2)", [u.id, finalMessage]);
    });
    await Promise.all(queries);
};

module.exports = { notifyUser, notifyAll };