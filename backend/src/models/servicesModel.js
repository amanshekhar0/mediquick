import mongoose from "mongoose";
const { Schema } = mongoose; 

const servicesSchema = new Schema({
    name:{
        required: true,
        type: String
    },
    category: {
        required: true,
        type: String
    },
    username: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "HospitalModel"
    },
    quantity: {
        type: Number,
        required: true
    },
    price:{
        type: Number,
        required: true
    },
    picture: {
        required: true,
        type: String
    }
}, { timestamps: true });
    

export const servicesModel = mongoose.model("servicesModel",servicesSchema)