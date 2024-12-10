import mongoose from "mongoose";
const { Schema } = mongoose; 

const pplSchema = new Schema({
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
    contact:{
        required: true,
        unique: true,
        type: Number
    },
    password: {
        type : String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        unique: true,
        required: true,
    },
    address:{
        type:String,
        required: true
    }
    
},{timestamps:true})


export const pplModel = mongoose.model("pplModel",pplSchema)