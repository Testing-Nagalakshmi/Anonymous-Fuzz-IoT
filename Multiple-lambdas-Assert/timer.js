  const express  = require('express');
  const mongoose = require('mongoose');
  const mqtt = require('mqtt');

  const app  = express();
  const PORT = 5172;               
  app.use(express.json());

  // Connect to DB
  mongoose.connect('mongodb+srv://iot-db:adithya123@fuzzcluster.vftfa3r.mongodb.net/iot-db?retryWrites=true&w=majority&appName=FuzzCluster')
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

  const acSchema = new mongoose.Schema({
    value: String,            // "ON" / "OFF"
    testCaseId: Number,
    timestamp: { type: Date, default: Date.now }
  });
  const ACState = mongoose.model('ACState', acSchema);

  const client = mqtt.connect('mqtt://localhost:1883');

  client.on('connect', () => {
      console.log('Timer server connected to MQTT broker');
  });

  app.get('/',(req,res)=>{res.send("HI")});

  app.post('/trigger', async (req, res) => {
    try {
      const { _id, testCaseId, value } = req.body;
      if (!_id) {
        return res.status(400).json({ error: 'Missing _id in request body' });
      }

      console.log(`Trigger received: _id=${_id}, testCaseId=${testCaseId}, value=${value}`);

      let count = 0;
      const interval = setInterval(async () => {
        count += 1;

        if (count >= 1000) {
          clearInterval(interval);

          try {
            await ACState.findByIdAndUpdate(_id, { value: 'OFF' });
            console.log(`[Timer] Reverted _id=${_id} to OFF after count=1000`);

            if (global.__coverage__) {
                const payload = JSON.stringify({
                    testCaseId,
                    coverage: global.__coverage__
                });
                client.publish('coverage/timer', payload);
            }

          } catch (updateErr) {
            console.error(`[Timer] Failed to revert _id=${_id}:`, updateErr.message);
          }
        }
      }, 1); 

      res.status(200).json({ status: 'counting', _id });

    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Timer server listening on port ${PORT}`);
  });
