const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
const collection = client.db().collection('activities');

async function start() {
  await client.connect();
  console.log('Connected to MongoDB');

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ client, dbName: 'last-time' }),
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  }, (accessToken, refreshToken, profile, done) => {
    done(null, {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      photo: profile.photos[0]?.value,
    });
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  // Auth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL || '/' }),
    (req, res) => res.redirect(process.env.CLIENT_URL || '/')
  );

  app.post('/auth/logout', (req, res) => {
    req.logout(() => res.json({ ok: true }));
  });

  app.get('/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json(null);
    res.json(req.user);
  });

  // Auth middleware
  function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // API routes — all scoped to the logged-in user
  app.get('/api/activities', requireAuth, async (req, res) => {
    const docs = await collection.find({ userId: req.user.id }).sort({ lastTime: -1 }).toArray();
    res.json(docs);
  });

  app.post('/api/activities', requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const existing = await collection.findOne({
      userId: req.user.id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existing) {
      const doc = await collection.findOneAndUpdate(
        { _id: existing._id },
        { $set: { lastTime: new Date() } },
        { returnDocument: 'after' }
      );
      return res.json(doc);
    }

    const doc = { userId: req.user.id, name: name.trim(), lastTime: new Date() };
    const result = await collection.insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  });

  app.patch('/api/activities/:id', requireAuth, async (req, res) => {
    const doc = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), userId: req.user.id },
      { $set: { lastTime: new Date() } },
      { returnDocument: 'after' }
    );
    res.json(doc);
  });

  app.delete('/api/activities/:id', requireAuth, async (req, res) => {
    await collection.deleteOne({ _id: new ObjectId(req.params.id), userId: req.user.id });
    res.json({ ok: true });
  });

  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

start().catch(console.error);
