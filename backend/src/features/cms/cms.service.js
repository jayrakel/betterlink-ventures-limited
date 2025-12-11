const db = require('../../config/db');
const path = require('path');
const fs = require('fs');

// --- PUBLIC CONTENT ---
const getPublicContent = async () => {
    const history = await db.query("SELECT * FROM group_history ORDER BY event_date ASC");
    const minutes = await db.query("SELECT * FROM meeting_minutes ORDER BY meeting_date DESC");
    const text = await db.query("SELECT * FROM website_content");
    
    const contentMap = {};
    text.rows.forEach(row => contentMap[row.section_key] = row.content_value);

    return { history: history.rows, minutes: minutes.rows, text: contentMap };
};

// --- TEXT MANAGEMENT ---
const updateTextContent = async (userId, key, value) => {
    await db.query(
        "INSERT INTO website_content (section_key, content_value, updated_by) VALUES ($1, $2, $3) ON CONFLICT (section_key) DO UPDATE SET content_value = $2, updated_by = $3",
        [key, value, userId]
    );
};

// --- HISTORY MANAGEMENT ---
const addHistoryEvent = async (title, date, description) => {
    await db.query("INSERT INTO group_history (event_title, event_date, description) VALUES ($1, $2, $3)", [title, date, description]);
};

const updateHistoryEvent = async (id, title, date, description) => {
    await db.query(
        "UPDATE group_history SET event_title=$1, event_date=$2, description=$3 WHERE id=$4", 
        [title, date, description, id]
    );
};

const deleteHistoryEvent = async (id) => {
    await db.query("DELETE FROM group_history WHERE id=$1", [id]);
};

// --- MINUTES MANAGEMENT ---
const addMinutes = async (title, date, filename) => {
    const filePath = `/uploads/minutes/${filename}`;
    await db.query("INSERT INTO meeting_minutes (title, meeting_date, file_path) VALUES ($1, $2, $3)", [title, date, filePath]);
};

const deleteMinutes = async (id) => {
    // Get file path first to delete from disk
    const fileRes = await db.query("SELECT file_path FROM meeting_minutes WHERE id=$1", [id]);
    
    if (fileRes.rows.length > 0) {
        // Construct absolute path (assuming 'backend' is root)
        const absolutePath = path.join(__dirname, '../../../', fileRes.rows[0].file_path);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    }
    
    await db.query("DELETE FROM meeting_minutes WHERE id=$1", [id]);
};

module.exports = { 
    getPublicContent, updateTextContent, 
    addHistoryEvent, updateHistoryEvent, deleteHistoryEvent,
    addMinutes, deleteMinutes 
};