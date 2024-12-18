require("dotenv").config();
import passport from "passport";
import db from "../models/index";
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_APP_CLIENT_ID,
      clientSecret: process.env.GOOGLE_APP_CLIENT_SECRET,
      callbackURL: `https://jobfinder222.vercel.app`,
    },
    async function (accessToken, refreshToken, profile, cb) {
      let dataRaw = {
        email: profile.emails[0].value,
      };
      let user = await db.User.findOne({
        where: { email: dataRaw.email },
        raw: true,
      });
      if (!user) {
        user = await db.User.create({
          email: dataRaw.email,
          firstName: "",
          lastName: "",
          address: "",
          point: 0,
          image: "",
          dob: null,
          roleCode: "USER",
          statusCode: "ACTIVE",
          typeLogin: "GOOGLE",
          isVerify: 1,
          isUpdate: 0,
          isVip: 0,
        });
      }
      return cb(null, user);
    }
  )
);

module.exports = passport;
