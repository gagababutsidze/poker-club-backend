export default (error, req, res, next) => {
 
   if (error.name ===  'JsonWebTokenError') {
        return res.status(401).json({ error: 'token is misssing!' })
      }
    
    else{
        res.status(400).json(error)
    }
 }