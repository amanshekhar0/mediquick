import mongoose from "mongoose";

const dbconnect=async () => {
    //const url=process.env.MONGO_URL;
    const connected = await mongoose.connect("mongodb+srv://annonminecraft:plzconnect@cluster0.qfbpx.mongodb.net/")
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));
}
export default dbconnect    