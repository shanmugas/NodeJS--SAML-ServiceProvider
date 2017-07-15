var saml2 = require('saml2-js');
var fs = require('fs');
var express = require('express');

var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// Shanmuga added to change the port for NODE server*****************************
var listener = app.listen(80, function(){
    console.log('Listening on port ' + listener.address().port); //Listening on port 8888
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


// Create service provider
var sp_options = {
    entity_id: "http://localhost/metadata.xml",
    private_key: fs.readFileSync("C:\\Users\\shanmugam\\Downloads\\umg-test\\rsaprivkey.pem").toString(),
    certificate: fs.readFileSync("C:\\Users\\shanmugam\\Downloads\\umg-test\\rsacert.pem").toString(),
    assert_endpoint: "http://www.agilisium.com",
    allow_unencrypted_assertion: true // TODO:  REMOVE THIS FOR DEBUG ONLY!!!!
};
var sp = new saml2.ServiceProvider(sp_options);

// Create identity provider
// The IDP Cert was pulled from the ADFS Metadata XML file and formatted using samltool.com
var idp_options = {
    sso_login_url: "https://52.42.139.191/adfs/ls/idpinitiatedsignon",
	sso_logout_url: "https://52.42.139.191/adfs/ls/idpinitiatedsignon",
    //sso_logout_url: "https://34.212.151.24/adfs/ls/idpinitiatedsignon",
    certificates: [fs.readFileSync("C:\\Users\\shanmugam\\Downloads\\umg-test\\idpcert.pem").toString()],
    allow_unencrypted_assertion: true // TODO:  REMOVE THIS FOR DEBUG ONLY!!!!
};
var idp = new saml2.IdentityProvider(idp_options);

// ------ Define express endpoints ------

// Endpoint to retrieve metadata
app.get("/metadata.xml", function(req, res) {
    res.type('application/xml');
    res.send(sp.create_metadata());
});

// Starting point for login
app.get("/login", function(req, res) {
    sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
        if (err != null)
            return res.send(500);
        res.redirect(login_url);
    });
});

// Assert endpoint for when login completes
app.post("/assert", function(req, res) {

    var options = {request_body: req.body};
    console.log (options);

    sp.post_assert(idp, options, function(err, saml_response) {
        console.log("***************************************************");
        console.log("SP CLIENT:  /assert called!");
        console.log("SP CLIENT:  The SAML response from ADFS follows ...");
        console.log(saml_response);
        console.log("***************************************************");

// TODO:  Jay and Mukund please look here!
// Error message:  "SAML Assertion signature check failed!  (checked 1 certificate(s))"
// NOTE it appears that 'allow_unencrypted_assertion: true' is being ignored????

        if (err != null)
            return res.sendStatus(500);

        console.log("SP CLIENT:  printing SAML AuthN response from IdP");
        console.log(saml_response);
        // Save name_id and session_index for logout
        // Note:  In practice these should be saved in the user session, not globally.
        name_id = saml_response.user.name_id;
        session_index = saml_response.user.session_index;

        res.send("Hello #{saml_response.user.name_id}!");
    });
});

// Starting point for logout
app.get("/logout", function(req, res) {
    var options = {
        name_id: name_id,
        session_index: session_index
    };

    sp.create_logout_request_url(idp, options, function(err, logout_url) {
        if (err != null)
            return res.send(500);
        res.redirect(logout_url);
    });
});

module.exports = app;
