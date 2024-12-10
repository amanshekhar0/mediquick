import mongoose from "mongoose";
const { Schema } = mongoose; 

const hospitalSchema = new Schema({
    username:{
        type : String,
        required : true,
        unique : true
    },
    email:{
        type : String,
        required : true,
        unique : true
    },
    password: {
        type : String,
        required: true,
        unique: true
    },
    address:{
        type:String,
        required: true
    },
    contact:{
        required: true,
        unique: true,
        type: Number
    },
    name: {
        type: String,
        unique: true,
        required: true,
    },
    pincode:{
        type: Number,
        required: true
    },
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServicesModel"
    }]
},{timestamps:true})


export const hospitalModel = mongoose.model("hospitalModel",hospitalSchema)