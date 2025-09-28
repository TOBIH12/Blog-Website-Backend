require('dotenv').config(); // MUST be first thing you do
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const upload = require('express-fileupload');
const PORT = process.env.PORT || 5000;
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');




const app = express();


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://blog-website-frontend-hfwp.vercel.app'); // Replace with your frontend URL
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors({origin: 'https://blog-website-frontend-hfwp.vercel.app', credentials: true})); // Allow CORS for the frontend app
app.use(upload({
    useTempFiles: true,
    tempFileDir: '/tmp/' // or any temp dir
  }));



app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use(notFound);
app.use(errorHandler);


mongoose.connect(process.env.MONGODB_URL).then(() => console.log('connected to mongoDB successfully')
).then(app.listen(PORT, () => console.log(`Server is running on port ${PORT}`)
)).catch((err) => console.log(err)
);

