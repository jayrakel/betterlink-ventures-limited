const db = require('../../config/db');

// ✅ FIX: Select ALL columns so we don't miss Next of Kin or IDs
const getProfile = async (userId) => {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) throw new Error('User not found');
    
    // Remove sensitive data
    const user = result.rows[0];
    delete user.password_hash;
    delete user.verification_token;
    
    return user;
};

const updateProfile = async (userId, data) => {
    const { full_name, phone_number, profile_image, next_of_kin_name, next_of_kin_phone, next_of_kin_relation } = data;
    
    // Dynamic update query could be better, but this is explicit and safe
    await db.query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name),
             phone_number = COALESCE($2, phone_number),
             profile_image = COALESCE($3, profile_image),
             next_of_kin_name = COALESCE($4, next_of_kin_name),
             next_of_kin_phone = COALESCE($5, next_of_kin_phone),
             next_of_kin_relation = COALESCE($6, next_of_kin_relation)
         WHERE id = $7`,
        [full_name, phone_number, profile_image, next_of_kin_name, next_of_kin_phone, next_of_kin_relation, userId]
    );
};

const getAllMembers = async () => {
    const result = await db.query("SELECT id, full_name, email, phone_number, role, is_active FROM users ORDER BY created_at DESC");
    return result.rows;
};

const logMemberMovement = async (adminId, data) => {
    const { user_id, action_type, reason } = data;
    await db.query(
        "INSERT INTO member_movement_log (user_id, action_type, reason, recorded_by) VALUES ($1, $2, $3, $4)",
        [user_id, action_type, reason, adminId]
    );
    if (action_type === 'LEFT' || action_type === 'SUSPENDED') {
        await db.query("UPDATE users SET is_active = false WHERE id = $1", [user_id]);
    } else if (action_type === 'REINSTATED') {
        await db.query("UPDATE users SET is_active = true WHERE id = $1", [user_id]);
    }
};

module.exports = { getProfile, updateProfile, getAllMembers, logMemberMovement };