// this router handles all things related to creating accounts and authentication

const express = require('express');
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { JWT_SECRET } = process.env;

const router = express.Router();

router.get('/', (req, res) => res.send('The auth router is working!'));

router.post('/register', (req, res) => {
    const { email, password, securityQuestionAnswer } = req.body;
    const newUser = new UserModel({ email, password, securityQuestionAnswer });
    const { _id } = newUser;
    
    newUser.save(err => {
        if (err) return res.status(500).json({ registerError: "There was an error when trying to register the user" });
        
        JWT.sign({ email, password, securityQuestionAnswer, _id }, JWT_SECRET, { expiresIn: "6hr", algorithm: 'HS256'}, (err, token) => {
            if (err) return res.status(500).json({ registerError: "There was an error when trying to generate a JWT for the user" });
            else res.status(200).json({ JWT: token });
        })
    })
});

router.post('/login', (req, res) => {
    const credentials = req.body;

    UserModel.findOne({ email: credentials.email })
        .then(userRecord => {
            if (!userRecord) return res.status(404).json({ loginError: 'No user with that email was found' });

            const { email, password, securityQuestionAnswer } = userRecord;
            if (bcrypt.compareSync(credentials.password, password)) {
                JWT.sign({ email, password, securityQuestionAnswer }, JWT_SECRET, { expiresIn: "6hr", algorithm: 'HS256' }, (err, decoded) => {
                    if (err) return res.status(500).json({ loginError: "There was an error when trying to generate a JWT for the user" });
                    res.status(200).json({ JWT: decoded });
                });
            } else res.status(401).json({ loginError: "The password provided didn't match the user record, please try again" });
        });
});

router.post('/forgot_pass', (req, res) => {
    const credentials = req.body;

    UserModel.findOne({ email: credentials.email })
        .then(userRecord => {
            if (!userRecord) return res.status(404).json({ lookupError: 'No user with that email address was found' })

            if (bcrypt.compareSync(credentials.securityQuestionAnswer, userRecord.securityQuestionAnswer)) {
                return res.status(200).json({ forgotPass: true });
            } else return  res.status(400).json({ forgotPassError: "There was an error checking the password, please try again" });
        });
});


router.put('/reset_pass', (req, res) => {
    const credentials = req.body;
    const newPassword = bcrypt.hashSync(credentials.password, 10);

    UserModel.findOneAndUpdate({ email: credentials.email }, { password: newPassword }, {}, (err, record) => {
        if (err) return res.status(400).json({ resetPassError: "There was an error resetting the password, please try again" });
        else {
            const { email, password, securityQuestionAnswer } = record;
            JWT.sign({ email, password, securityQuestionAnswer }, JWT_SECRET, { expiresIn: "6hr", algorithm: 'HS256' }, (err, decoded) => {
                if (err) return res.status(500).json({ loginError: "There was an error trying to generate a JWT for the user" });
                else return res.status(200).json({ JWT: decoded, resetPass: true });
            })
        }
    })
})




module.exports = router;