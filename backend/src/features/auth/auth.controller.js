const authService = require('./auth.service');

const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.json({ message: "User registered. Verification email sent.", user });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(400).json({ error: err.message || "Registration failed" });
    }
};

const login = async (req, res) => {
    try {
        const { user, token } = await authService.loginUser(req.body.email, req.body.password);
        
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,       
            sameSite: isProduction ? 'none' : 'lax',   
            maxAge: 8 * 60 * 60 * 1000 
        });

        res.json({ 
            message: "Login successful", 
            user: { 
                id: user.id, 
                name: user.full_name, 
                email: user.email, 
                role: user.role,
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
        await authService.verifyEmail(req.body.token);
        res.json({ success: true, message: "Email verified successfully!" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logged out" });
};

const changePassword = async (req, res) => {
    try {
        await authService.changePassword(req.user.id, req.body.newPassword);
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
};

module.exports = { register, login, verifyEmail, logout, changePassword };