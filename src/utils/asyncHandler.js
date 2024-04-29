const asyncHandler = (fn) => async (req, res, next) => {
  try {
    const refunc = await fn(req, res, next);
    return refunc;
  } catch (error) {
    res.status(500 || error.code).json({
      success: false,
      message: error.message,
    });
  }
};

export { asyncHandler };
/*
  export const asyncHandler = (requestHandler)=>{
     (req,res,next)=>{
         Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
     }
  }
 */
