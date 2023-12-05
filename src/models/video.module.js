import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-paginate-v2";

const videoSchema = new Schema (
    {
        videoFile: {
            type : String, // Url to be stored from Cloudinary
            required : true
        },
        thumbnail: {
            type : String, // Url to be stored from Cloudinary
            required : true
        },
        title: {
            type : String,
            required : true
        },
        description: {
            type : String,
            required : true
        },
        duration: {
            type : Number, // Will get from Coudinary after Upload
            required : true
        },
        views: {
            type : Number,
            default : 0
        },
        isPublished: {
            type : Boolean,
            default : true
        },
        owner: {
            type : Schema.Types.ObjectId ,
            ref : "User"
        }
    },
    {
        timestamps : true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)