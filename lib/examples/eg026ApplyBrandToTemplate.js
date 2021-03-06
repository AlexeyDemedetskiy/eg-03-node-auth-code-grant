/**
 * @file
 * Example 026: Apply Brand to Template
 * @author DocuSign
 */

const path = require('path')
    , fs = require('fs-extra')
    , docusign = require('docusign-esign')
    , validator = require('validator')
    , dsConfig = require('../../ds_configuration.js').config
    ;
    
const eg026ApplyBrandToTemplate = exports
    , eg = 'eg026' // This example reference.
    , mustAuthenticate = '/ds/mustAuthenticate'
    , minimumBufferMin = 3
    , demoDocsPath = path.resolve(__dirname, '../../demo_documents')
    ;

/**
 * Create the envelope
 * @param {object} req Request obj 
 * @param {object} res Response obj
 */
eg026ApplyBrandToTemplate.createController = async (req, res) => {
    // Step 1: Obtain your OAuth token
    // At this point we should have a good token. But we
    // double-check here to enable a better UX to the user.
    let tokenOK = req.dsAuthCodeGrant.checkToken(minimumBufferMin);
    if (! tokenOK) {
        req.flash('info', 'Sorry, you need to re-authenticate.');
        // We could store the parameters of the requested operation so it could be 
        // restarted automatically. But since it should be rare to have a token issue
        // here, we'll make the user re-enter the form data after authentication.
        req.dsAuthCodeGrant.setEg(req, eg);
        res.redirect(mustAuthenticate);
    }

    let body = req.body
        // Additional data validation might also be appropriate
        , signerEmail = validator.escape(body.signerEmail)
        , signerName = validator.escape(body.signerName)
        , ccEmail = validator.escape(body.ccEmail)
        , ccName = validator.escape(body.ccName)
        , brandId = validator.escape(body.brandId)
        , templateId = validator.escape(body.templateId)

    args = {
        accessToken: req.user.accessToken,  // represents your {ACCESS_TOKEN}
        basePath: req.session.basePath,
        accountId: req.session.accountId,   // represents your {ACCOUNT_ID}
        brandId: brandId,
        templateId: templateId,
        status: req.status,
        templateRoles: [
            {
                name: signerName,
                email: signerEmail,
                roleName: "signer"
            },
            {
                name: ccName,
                email: ccEmail,
                roleName: "cc"
            }
        ]
    }
      , results = null
      ;

    // Step 2. Construct your API headers
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(args.basePath);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);

    let envelopesApi = new docusign.EnvelopesApi(dsApiClient);
    
    // Step 3: updates the template.
    try {
        results = await envelopesApi.createEnvelope(args.accountId, {
            envelopeDefinition: {
                templateId: args.templateId,
                brandId: args.brandId,
                templateRoles: args.templateRoles,
                status: args.status
            }
        })
    }
    catch (error) {
        let errorBody = error && error.response && error.response.body
            // we can pull the DocuSign error code and message from the response body
            , errorCode = errorBody && errorBody.errorCode
            , errorMessage = errorBody && errorBody.message
            ;
        // In production, may want to provide customized error messages and 
        // remediation advice to the user.
        res.render('pages/error', {err: error, errorCode: errorCode, errorMessage: errorMessage});
    }

    if (results) {
        res.render('pages/example_done', {
            title: "Envelope sent",
            h1: "Envelope sent",
            message: `The envelope has been created and sent!<br />Envelope ID: ${results.envelopeId}.`
        });
    }
}

// ***DS.snippet.0.end

/**
 * Form page for this application
 */
eg026ApplyBrandToTemplate.getController = async (req, res) => {
    // Check that the authentication token is ok with a long buffer time.
    // If needed, now is the best time to ask the user to authenticate
    // since they have not yet entered any information into the form.
    let tokenOK = req.dsAuthCodeGrant.checkToken();
    if (tokenOK) {

        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(req.session.basePath);
        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.user.accessToken);

        let templatesApi = new docusign.TemplatesApi(dsApiClient)
        templatesResponse = await templatesApi.listTemplates(req.session.accountId);

        let brandApi = new docusign.AccountsApi(dsApiClient)
        brandsResponse = await brandApi.listBrands(req.session.accountId)

        res.render('pages/examples/eg026ApplyBrandToTemplate', {
            eg: eg, csrfToken: req.csrfToken(),
            title: "Apply brand to template",
            sourceFile: path.basename(__filename),
            sourceUrl: dsConfig.githubExampleUrl + path.basename(__filename),
            documentation: dsConfig.documentation + eg,
            showDoc: dsConfig.documentation,
            brands: brandsResponse.brands || [],
            templates: templatesResponse.envelopeTemplates || []
        });
    } else {
        // Save the current operation so it will be resumed after authentication
        req.dsAuthCodeGrant.setEg(req, eg);
        res.redirect(mustAuthenticate);
    }
}
