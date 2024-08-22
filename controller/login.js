const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/signupSchema.js');
const router = express.Router();
const Image = require('../models/Image'); 

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

 
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

   const userImages = await Image.findOne({ userId: user._id });

  const mysecretkey = process.env.JWT_SECRET;
    // Payload to generate JWT
    const payload = {
      userId: user._id,
      name: user.name,
      email: user.email,
    };
    
// Create a jsonwebtoken that expires in 5 days
const token = jwt.sign(payload, mysecretkey, { expiresIn: '5d' });

  res.status(200).json({
    msg: "User is logged in",
    token: token
  });
});

module.exports = router;