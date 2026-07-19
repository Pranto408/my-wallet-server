import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Try finding by googleId first
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          // Try finding by email
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            // Update user to have googleId
            user.googleId = profile.id;
            if (profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
          } else {
            // Create user
            user = new User({
              name: profile.displayName || profile.name?.givenName || 'Google User',
              email: email.toLowerCase(),
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value || '',
            });
            await user.save();
          }
        }

        return done(null, user);
      } catch (err: any) {
        return done(err);
      }
    }
  )
);

export default passport;
