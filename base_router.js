const sendResponse = (res, httpcode, code, message, data = null) => {
    try {
        res.status(httpcode).json({ code, message, data });
    } catch (error) {
        console.error("sendResponse Error", error);
    }
};

// placeholder
const isAuthenticated = (req, res, next) => {
    if (req.session &&  req.session.wallet && req.session.wallet.addr) {
        next(); // placeholder
    } else {
        sendResponse(res, 401, 'Unauthorized: No session available.');
    }
};


const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export {isAuthenticated,delay,sendResponse}