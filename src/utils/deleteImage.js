import { v2 as cloudinary } from "cloudinary";
export const deleteOldImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      console.log("No image Url");
    }
    const res = await cloudinary.uploader.destroy(imageUrl.public_id, {
      resource_type: "auto",
    });
    console.log("Image deleted successfuly", res);
    return res;
  } catch (error) {
    console.log("Error in  deleting the image", error);
  }
};
