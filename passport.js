const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('./Schema/userModel');

// Function to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, role: user.role, company: user.company },
        process.env.JWT_SECRET, // Use a secret key from your environment variables
        { expiresIn: '1h' }     // Token expiration time
    );
};
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "/auth/google/callback",
            scope: ['profile', 'email']
        },
        async function(accessToken, refreshToken, profile, callback) {
            try {
                // Check if the user exists in the database
                let user = await User.findOne({ googleId: profile.id });
            
                if (!user) {
                  // Assign a random company and role
                  const randomCompany = `Company_${Math.floor(Math.random() * 1000)}`;
                  const role = "employee";  // Default role
            
                  // Create a new user entry
                  user = new User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    company: randomCompany,
                    role: role
                  });
            
                  // Save the new user to the database
                  await user.save();
                }
                // Generate a JWT token for the user
                const token = generateToken(user);
                // Pass both the user and token back to the callback
                return callback(null, { user, token });
              } catch (err) {
                console.error(err);
                return callback(err, null);
              }
        }

    )

);

passport.serializeUser((user, callback) => {
    callback(null, user);
});

passport.deserializeUser((user, callback) => {
    callback(null, user);
}); 
