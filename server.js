const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const session = require('express-session');

const store = MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/Fitness',
    collectionName: 'sessions'
});


mongoose.connect('mongodb://localhost:27017/Fitness');
const db = mongoose.connection;
db.on('error', console.error.bind(console, "connection error"));
db.once('open', function(callback) {
    console.log("connection succeeded");
})

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'ganji123',
    resave: false,
    saveUninitialized: false,
    store: store
}));

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user; // Access user information in templates
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
};

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HomePage.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
app.get('/signup.html', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/workoutplan.html', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'workoutplan.html'));
});
app.get('/dayRoutine.html', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'dayRoutine.html'));
});
app.get('/getUserProfile', async (req, res) => {
    try {
        // Check if user session exists and has user information
        if (!req.session.user || !req.session.user.username) {
            return res.status(401).json({ success: false, errorMessage: "User is not authenticated." });
        }

        const username = req.session.user.username;

        // Find the user's profile
        const userProfile = await Profile.findOne({ username: username });

        if (!userProfile) {
            return res.status(404).json({ success: false, errorMessage: "User profile not found." });
        }

        res.json({ success: true, profile: userProfile, profilePic: userProfile.profilePic });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, errorMessage: "Error occurred while fetching user profile." });
    }
});


app.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find(); // Fetch all posts from the database
        const postsWithProfile = await Promise.all(posts.map(async (post) => {
            // Fetch profile information for the author of each post
            const userProfile = await Profile.findOne({ username: post.username });
            console.log("userProfile for post:", userProfile);
            return { 
                _id: post._id,
                username: post.username,
                message: post.message,
                imagePath: post.imagePath,
                nickname: userProfile.nickname,
                profilePic: userProfile.profilePic
                
            };
        }));
        
        res.json({ success: true, posts: postsWithProfile });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ success: false, errorMessage: "Error occurred while fetching posts." });
    }
});


const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const User = mongoose.model('User', UserSchema, 'users');

const ProfileSchema = new mongoose.Schema({
    username: String,
    nickname: String,
    height: {
        feet: Number,
        inches: Number
    },
    weight: Number,
    bmi: Number,
    profilePic: String
});

const Profile = mongoose.model('Profile', ProfileSchema, 'profile');
const WorkoutSchema = new mongoose.Schema({
    username: String,
    daysCompleted: Number
});

const Workout = mongoose.model('Workout', WorkoutSchema, 'workouts');
const postSchema = new mongoose.Schema({
    username: String,
    nickname: String, // Add nickname field
    message: String,
    profilePic: String,
    imagePath: String
}, { collection: 'Post' }); // Specify the collection name here

const Post = mongoose.model('Post', postSchema ,'Post');

async function verifyEmail(email) {
    const fetch = await import('node-fetch'); 
    const apiKey = 'cb412163ba81147afa876c6479f0eaead2a9ee0f'; 
    const url = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${apiKey}`;
    
    try {
        const response = await fetch.default(url);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error verifying email:', error);
        return null;
    }
}

app.post('/signup', async function(req, res) {

    const { username, email, password } = req.body;

    try {
        
        const emailVerificationResult = await verifyEmail(email);

        if (emailVerificationResult && emailVerificationResult.result === 'deliverable') {
            
            const existingUser = await User.findOne({ $or: [{ username: username }, { email: email }] });
            if (existingUser) {
                
                let errorMessageUsername = null;
                let errorMessageEmail = null;

                if (existingUser.username === username) {
                    errorMessageUsername = "Username already exists.";
                }

                if (existingUser.email === email) {
                    errorMessageEmail = "Email already exists.";
                }

                res.status(400).json({
                    success: false,
                    errorMessageUsername: errorMessageUsername,
                    errorMessageEmail: errorMessageEmail
                });

                return;
            }

            const newUser = new User({ username, email, password });

            
            await newUser.save();

            
            res.json({ success: true });
        } else {
            
            res.status(400).json({ success: false, errorMessageEmail: "Invalid email address" });
        }
    } catch (error) {
    
        console.error(error);
        res.status(500).json({ success: false, errorMessage: "Error occurred during signup" });
    }
});
app.post('/workoutCompleted', async function(req, res) {
    try {
        // Check if user session exists and has user information
        if (!req.session.user || !req.session.user.username) {
            return res.status(401).json({ success: false, errorMessage: "User is not authenticated." });
        }

        const username = req.session.user.username;

        // Find the user's profile and update the daysCompleted column
        await Workout.updateOne({ username: username }, { $inc: { daysCompleted: 1 } });

        res.json({ success: true });
    } catch (error) {
        console.error('Error completing workout:', error);
        res.status(500).json({ success: false, errorMessage: "Error occurred while completing workout." });
    }
});

app.post('/login', async function(req, res) {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username: username });
        if (!existingUser || existingUser.password !== password) {
            return res.status(400).json({ success: false, errorMessage: "Invalid username or password" });
        }

        // Set user session after successful login
        req.session.user = { username: existingUser.username };

        // Check if the user exists in the workouts collection
        let userWorkout = await Workout.findOne({ username: username });

        // If the user doesn't exist in the workouts collection, create a new document
        if (!userWorkout) {
            userWorkout = new Workout({ username: username, daysCompleted: 0 });
            await userWorkout.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, errorMessage: "Error occurred during login" });
    }
});

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, file.fieldname === 'profilePic' ? 'public/profileImages' : 'public/uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

app.post('/saveProfile', upload.single('profilePic'), async function(req, res) {
    const { nickname, heightFeet, heightInches, weight } = req.body;

    // Check if user session exists and has user information
    if (!req.session.user || !req.session.user.username) {
        return res.status(401).json({ success: false, errorMessage: "User is not authenticated." });
    }

    const username = req.session.user.username; 

    try {
        
        const existingProfile = await Profile.findOne({ username: username });

        
        const heightInMeters = ((parseInt(heightFeet) * 12) + parseInt(heightInches)) * 0.0254;
        const bmi = parseInt(weight) / (heightInMeters * heightInMeters);

        
        const profileData = {
            username: username,
            nickname: nickname,
            height: {
                feet: parseInt(heightFeet),
                inches: parseInt(heightInches)
            },
            weight: parseInt(weight),
            bmi: bmi,
            profilePic: '/profileImages/' + req.file.filename
        };

        if (existingProfile) {
        
            await Profile.findOneAndUpdate({ username: username }, profileData);
        } else {
            
            await Profile.create(profileData);
        }

        console.log('Profile saved successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving profile:', error);
        res.status(500).json({ success: false, errorMessage: "Error occurred while saving profile." });
    }
});
const postUpload = multer({ storage: storage });

app.post('/savePost', postUpload.single('image'), async (req, res) => {
    console.log('Received request to save post:', req.body, req.file);

    if (!req.file) {
        console.log('No image uploaded');
        return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    try {
        // Fetch user profile data
        const userProfile = await Profile.findOne({ username: req.session.user.username });

        if (!userProfile) {
            console.error('User profile not found');
            return res.status(404).json({ success: false, message: 'User profile not found' });
        }

        // Create new post document with user information
        const newPost = new Post({
            username: req.session.user.username,
            message: req.body.message,
            imagePath: '/uploads/' + req.file.filename,
            nickname: userProfile.nickname, // Include nickname
            profilePic: userProfile.profilePic // Include profilePic
        });

        // Save post to the database
        await newPost.save();
        console.log('Post saved successfully:', newPost);
        return res.status(200).json({ success: true, message: 'Post saved successfully' });
    } catch (error) {
        console.error('Error saving post:', error);
        return res.status(500).json({ success: false, message: 'Failed to save post' });
    }
});
app.listen(3000, function() {
    console.log("Server listening at port 3000");
}); 