import mongoose, {Schema, SchemaType} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt, { compare } from "bcrypt";

const UserSchema = new Schema (
    {
        username: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true
        },
        email: {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fullName: {
            type : String,
            required : true,
            trim : true,
            index : true
        },
        avatar: {
            type : String, // Url to be stored from Cloudinary
            required : true
        },
        coverImage: {
            type : String // Url to be stored from Cloudinary
        },
        watchHistory: [
            {
                type : Schema.Types.ObjectId ,
                ref : "Video"
            }
        ],
        password: {
            type : String,
            required : [true, 'Password is Mandatory']
        },
        refreshToken: {
            type : String
        }

    },{
        timestamps : true
    }
)

UserSchema.pre("save", async function (next) {
    if(!this.isModified) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
});

UserSchema.methods.isPasswordCorrect = async function (password){
   return await bcrypt.compare(password, this.password)
};

UserSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullName : this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
};
UserSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};


export const User = mongoose.model("User", UserSchema)