const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(activities) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(activities, null, 2));
}

app.get('/api/activities', (req, res) => {
  const activities = readData();
  res.json(activities.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime)));
});

app.post('/api/activities', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const activities = readData();
  const existing = activities.find(a => a.name.toLowerCase() === name.trim().toLowerCase());

  if (existing) {
    existing.lastTime = new Date().toISOString();
    writeData(activities);
    return res.json(existing);
  }

  const doc = { _id: randomUUID(), name: name.trim(), lastTime: new Date().toISOString() };
  activities.push(doc);
  writeData(activities);
  res.json(doc);
});

app.patch('/api/activities/:id', (req, res) => {
  const activities = readData();
  const doc = activities.find(a => a._id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  doc.lastTime = new Date().toISOString();
  writeData(activities);
  res.json(doc);
});

app.delete('/api/activities/:id', (req, res) => {
  const activities = readData().filter(a => a._id !== req.params.id);
  writeData(activities);
  res.json({ ok: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
