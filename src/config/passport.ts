import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '@models/User.js';
import { generateUsername, generatePassword } from '@utils/generators.js';
import logger from './logger.js';

// Only configure Google OAuth if credentials are provided
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret && googleClientId !== 'your-google-client-id') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if email exists
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              user.avatar = profile.photos?.[0]?.value;
              await user.save();
              return done(null, user);
            }
          }

          // Create new user
          const username = await generateUsername(
            profile.displayName || profile.emails?.[0]?.value || 'user'
          );
          const password = generatePassword();

          user = await User.create({
            email: email || `${profile.id}@google.com`,
            username,
            password,
            googleId: profile.id,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            avatar: profile.photos?.[0]?.value,
            isEmailVerified: true,
            authProvider: 'google',
          });

          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
  logger.info('✅ Google OAuth configured');
} else {
  logger.warn('⚠️  Google OAuth not configured - missing client credentials');
}

export default passport;

