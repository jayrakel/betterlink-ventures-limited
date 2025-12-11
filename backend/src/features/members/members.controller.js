const memberService = require('./members.service');

const getMyProfile = async (req, res) => {
    try {
        const user = await memberService.getProfile(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        await memberService.updateProfile(req.user.id, req.body);
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Phone number already in use." });
        res.status(500).json({ error: "Update failed" });
    }
};

const listMembers = async (req, res) => {
    try {
        const members = await memberService.getAllMembers();
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

const logMovement = async (req, res) => {
    try {
        await memberService.logMemberMovement(req.user.id, req.body);
        res.json({ message: "Member status updated and logged." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getMyProfile, updateMyProfile, listMembers, logMovement };