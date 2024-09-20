//
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "auth/google/callback",
            scope: ['profile', 'email']
        },
        function(accessToken, refreshToken, profile, callback) {
            console.log('profile', profile);
            return callback(null, profile);
        }

    )

);

passport.serializeUser((user, callback) => {
    callback(null, user);
});

passport.deserializeUser((user, callback) => {
    callback(null, user);
});
