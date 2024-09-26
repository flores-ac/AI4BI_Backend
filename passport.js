const jwt = require('jsonwebtoken');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('./Schema/userModel');
const { encryptToken } = require('./Utils/encryptionUtils');  // Import the encryption function

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

                // Encrypt the access token before storing it
                const encryptedAccessToken = encryptToken(accessToken);

                if (!user) {
                    // Assign a random company and role
                    const randomCompany = `Company_${Math.floor(Math.random() * 1000)}`;
                    const role = "employee";  // Default role

                    // Create a new user entry
                    user = new User({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        profilePicture: profile.photos[0].value,  // Store profile picture URL
                        company: randomCompany,
                        role: role,
                        googleAccessToken: encryptedAccessToken  // Store the encrypted access token
                    });

                    // Save the new user to the database
                    await user.save();
                } else {
                    // Update the user with the latest encrypted access token if needed
                    user.googleAccessToken = encryptedAccessToken;
                    await user.save();
                }

                // Generate a JWT token for the user (for your app)
                const token = generateToken(user);

                // Pass both the user and token (JWT) back to the callback
                return callback(null, { user, token, accessToken });  // Include accessToken here
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
