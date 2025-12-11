const authService = require('./auth.service');

const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json({ message: "User registered successfully", user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { user, token } = await authService.loginUser(req.body.email, req.body.password);
        
        // Security: Set Cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,       
            sameSite: isProduction ? 'none' : 'lax',   
            maxAge: 8 * 60 * 60 * 1000 
        });

        // ✅ FIX: Send ALL user fields so frontend has ID, Phone, Next of Kin, etc.
        res.json({ 
            message: "Login successful", 
            token: token, 
            user: { 
                id: user.id, 
                name: user.full_name, 
                email: user.email, 
                role: user.role,
                phone_number: user.phone_number,
                id_number: user.id_number,
                kra_pin: user.kra_pin,
                next_of_kin_name: user.next_of_kin_name,
                next_of_kin_phone: user.next_of_kin_phone,
                next_of_kin_relation: user.next_of_kin_relation,
                profile_image: user.profile_image,
                mustChangePassword: user.must_change_password 
            } 
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(400).json({ error: err.message });
    }
};

const verifyEmail = async (req, res) => {
    try {
        await authService.verifyEmail(req.query.token);
        res.json({ message: "Email verified successfully" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logged out successfully" });
};

const changePassword = async (req, res) => {
    try {
        await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
        res.json({ message: "Password updated" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

module.exports = { register, login, verifyEmail, logout, changePassword };