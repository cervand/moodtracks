exports.handler = async (event, context) => {
    // Retrieve environment variables
    const clientid = process.env.CLIENT_ID;
    const apiscope = process.env.API_SCOPE;
    const rediURI = process.env.REDIRECT_URI;
  
    const params = {
      CLIENT_ID: clientid,
      API_SCOPE: apiscope,
      REDIRECT_URI: rediURI,
    };
  
    return {
      statusCode: 200,
      body: JSON.stringify(params),
    };
  };
  