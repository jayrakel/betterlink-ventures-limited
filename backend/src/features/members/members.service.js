const db = require('../../config/db');

const getProfile = async (userId) => {
    const result = await db.query(
        `SELECT id, full_name, email, phone_number, role, 
        id_number, kra_pin, next_of_kin_name, next_of_kin_phone, next_of_kin_relation, 
        profile_image, created_at, is_active 
        FROM users WHERE id = $1`,
        [userId]
    );
    return result.rows[0];
};

const updateProfile = async (userId, data) => {
    const { full_name, phone_number, next_of_kin_name, next_of_kin_phone, next_of_kin_relation, profile_image } = data;
    
    await db.query(
        `UPDATE users SET 
            full_name = COALESCE($1, full_name),
            phone_number = COALESCE($2, phone_number),
            next_of_kin_name = COALESCE($3, next_of_kin_name),
            next_of_kin_phone = COALESCE($4, next_of_kin_phone),
            next_of_kin_relation = COALESCE($5, next_of_kin_relation),
            profile_image = COALESCE($6, profile_image)
        WHERE id = $7`,
        [full_name, phone_number, next_of_kin_name, next_of_kin_phone, next_of_kin_relation, profile_image, userId]
    );
};

const getAllMembers = async () => {
    const result = await db.query("SELECT id, full_name, email, phone_number, role, created_at, is_active FROM users ORDER BY created_at DESC");
    return result.rows;
};

const logMemberMovement = async (adminId, data) => {
    const { user_id, action_type, reason } = data;
    
    // 1. Log
    await db.query(
        "INSERT INTO member_movement_log (user_id, action_type, reason, recorded_by) VALUES ($1, $2, $3, $4)",
        [user_id, action_type, reason, adminId]
    );

    // 2. Status Update
    if (action_type === 'LEFT' || action_type === 'SUSPENDED') {
        await db.query("UPDATE users SET is_active = false WHERE id = $1", [user_id]);
    } else if (action_type === 'REINSTATED') {
        await db.query("UPDATE users SET is_active = true WHERE id = $1", [user_id]);
    }
};

module.exports = { getProfile, updateProfile, getAllMembers, logMemberMovement };