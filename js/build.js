$('[data-login-ds-id]').each(function(){
  var _this = this;
  this.$container = $(this);
  this.id = this.$container.attr('data-login-ds-id');
  data = Fliplet.Widget.getData(this.id);

  this.pvName = 'login_data_source_component_' + this.id;
  var dataStructure = {
    auth_token: '',
    id: '',
    email: '',
    createdAt: null
  };

  var CODE_VALID = 30,
      CODE_LENGTH = 6,
      // @TODO: GET APP NAME
      APP_NAME = data.appName,
      APP_VALIDATION_DATA_DIRECTORY_ID = data.dataSource,
      DATA_DIRECTORY_EMAIL_COLUMN = data.emailColumn,
      DATA_DIRECTORY_PASS_COLUMN = data.passColumn;


  function initEmailValidation() {
    Fliplet.Security.Storage.init().then(function(){

      attachEventListeners();

      // @TODO: Redirect if Logged in

    });
  }

  function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  function calculateElHeight(el) {

    var elementHeight = el.outerHeight();
    el.parents('.fl-restore-pass').css('height', elementHeight);

    if (el.hasClass('start')) {
      el.removeClass('start').addClass('present');
    }

  }

  function loginFromDataSource(data_source_id, email_object, pass_column, pass, success_callback, fail_callback) {
    //read_data_sources -> OK.

    Fliplet.DataSources.connect(data_source_id).then(function(dataSource){
      return dataSource.find({
        where: email_object
      });
    }).then(function(entries){
      if(entries.length) {
        entries.forEach(function(entry) {
          if ( entry.data[pass_column] === pass ) {
            success_callback();
            return;
          } else {
            fail_callback(false);
            return;
          }
        });
      } else {
        fail_callback(true);
      }
    }, function() {
      fail_callback(true);
    });
  }

  function resetFromDataSource(data_source_id, email_object, pass_column, success_callback, fail_callback) {
    //read_data_sources -> OK.

    Fliplet.DataSources.connect(data_source_id).then(function(dataSource){
      return dataSource.find({
        where: email_object
      });
    }).then(function(entries){
      if(entries.length) {
        entries.forEach(function(entry) {
          if ( entry.data[pass_column] !== '' ) {
            success_callback();
            return;
          } else {
            fail_callback(false);
            return;
          }
        });
      } else {
        fail_callback(true);
      }
    }, function() {
      fail_callback(true);
    });
  }

  function sendEmail(body, replyTo, subject, to, success_callback, fail_callback) {

    var options = {
      "to": [{
        "email": to,
        "name": "",
        "type": "to"
      }],
      "html": body,
      "subject": subject
    };

    Fliplet.Communicate.sendEmail(options).then(success_callback, fail_callback);

  }

  function sendNotification(contact, success_callback, fail_callback) {

    // Let's update the PV with this new data
    userDataPV.code = rDigits(CODE_LENGTH);
    userDataPV.code_generated_at = Date.now();
    Fliplet.Security.Storage.update().then(function(){
      var body = generateVerifyBody();

      sendEmail(body, contact, APP_NAME, contact, success_callback, fail_callback);
    });
  }

  function generateVerifyBody() {
    var body;
    var string = $("#email-template-holder").html();
    var template = Handlebars.compile(string);
    body = template({
      code: userDataPV.code,
      time: moment().format('MMM Do YY, h:mm:ss a'),
      app_name: APP_NAME,
      code_duration: CODE_VALID
    });

    return body;
  }

  function rDigits(length) {
    var r = Math.random().toString().slice(2, length + 2);
    return r.length === length ? r : rDigits(length);
  }

  function attachEventListeners() {

    this.$container.find('.btn-login').on('click', function() {
      var _this = $(this);
      _this.parents('.form-btns').find('.text-danger').addClass('hidden');

      window.profileEmail = this.$container.find('input.profile_email').val().toLowerCase(); // GET EMAIL VALUE

      // @TODO: SALT password entered by user and save it in the var below for comparisson with the SALTED password already stored in DS
      window.profilePassword = this.$container.find('input.profile_password').val();

      // Triggers loading
      $(this).addClass('loading');
      $(this).find('span').addClass('hidden');
      $(this).find('.loader').addClass('show');

      if (validateEmail(profileEmail)) {
        // CHECK FOR EMAIL ON DATA SOURCE
        loginFromDataSource(APP_VALIDATION_DATA_DIRECTORY_ID, '{"' + DATA_DIRECTORY_EMAIL_COLUMN+'":' + '"' + profileEmail + '"}', DATA_DIRECTORY_PASS_COLUMN, profilePassword, function () {
          // Reset Login button
          _this.removeClass('loading');
          _this.find('span').removeClass('hidden');
          _this.find('.loader').removeClass('show');

          if(typeof data.loginAction !== "undefined") {
            Fliplet.Navigate.to(data.loginAction);
          }
        }, function ( error ) {
          if ( error ) {
            // EMAIL NOT FOUND ON DATA SOURCE

            // Reset Login button
            _this.removeClass('loading');
            _this.find('span').removeClass('hidden');
            _this.find('.loader').removeClass('show');
            _this.parents('.form-btns').find('.text-danger').html("We couldn't find your email in our system. Please try again.").removeClass('hidden');
          } else {
            // EMAIL FOUND ON DATA SOURCE BUT PASS DOESN'T MATCH

            // Reset Login button
            _this.removeClass('loading');
            _this.find('span').removeClass('hidden');
            _this.find('.loader').removeClass('show');
            _this.parents('.form-btns').find('.text-danger').html("Your email or password don't match. Please try again.").removeClass('hidden');
          }
        });
      } else {
        // INVALID EMAIL

        // Reset Login button
        _this.removeClass('loading');
        _this.find('span').removeClass('hidden');
        _this.find('.loader').removeClass('show');
        // Show error
        _this.parents('.form-btns').find('.text-danger').html("Please enter a valid email.").removeClass('hidden');
      }
    });

    // EVENT LISTENER FOR FORGET PASSWORD RESET
    // Just switches views Login to Email verification
    // Leave as it is
    this.$container.find('.btn-forget-pass').on('click', function() {
    	$('.fl-login-holder').fadeOut(100);
      setTimeout(function() {
      	$('.fl-restore-pass').fadeIn(250);
    		calculateElHeight( this.$container.find('.state[data-state=verify-email]') );
      }, 100);
    });


    this.$container.find('.back-login').on('click', function() {
    	$('.fl-restore-pass').fadeOut(100);
      setTimeout(function() {
      	$('.fl-login-holder').fadeIn(250);

        // Reset states of email verification
        this.$container.find('.reset-email-error').addClass('hidden');
        this.$container.find('.pin-verify-error').addClass('hidden');
        this.$container.find('.pin-sent-error').addClass('hidden');
    		$('.state').removeClass('present past').addClass('future');
        $('.state[data-state=verify-email]').removeClass('future').addClass('start');
      }, 100);
    });

    this.$container.find('.verify-identity').on('click', function(event) {
      var _this = $(this);
      _this.addClass("disabled");

      window.resetEmail = this.$container.find('input.reset-email-field').val().toLowerCase(); // Get email for reset

      this.$container.find('.reset-email-error').removeClass('show');
      // EMAIL FOUND ON DATA SOURCE
      if (this.$container.find('.state[data-state=verify-email] .form-group').hasClass('has-error')) {
        this.$container.find('.state[data-state=verify-email] .form-group').removeClass('has-error');
      }

      // VALIDATE EMAIL
      if (validateEmail(resetEmail)) {
        // CHECK FOR EMAIL ON DATA SOURCE
        resetFromDataSource(APP_VALIDATION_DATA_DIRECTORY_ID, '{"' + DATA_DIRECTORY_EMAIL_COLUMN+'":' + '"' + resetEmail + '"}', DATA_DIRECTORY_PASS_COLUMN, function () {
          // EMAIL FOUND ON DATA SOURCE
          userDataPV.email = emailAddress;

          if (this.$container.find('.state[data-state=verify-email] .form-group').hasClass('has-error')) {
            this.$container.find('.state[data-state=verify-email] .form-group').removeClass('has-error');
          }
          sendNotification(resetEmail, function () {
            // TRANSITION
            this.$container.find('.state.present').removeClass('present').addClass('past');

            this.$container.find('.verify-user-email').text(resetEmail); // UPDATES TEXT WITH EMAIL
            _this.removeClass("disabled");

            calculateElHeight(this.$container.find('.state[data-state=verify-code]'));
            this.$container.find('.state[data-state=verify-code]').removeClass('future').addClass('present');
          }, function () {
            this.$container.find('.reset-email-error').text(CONTACT_UNREACHABLE).removeClass('hidden');
          });

        }, function ( error ) {
          if ( error ) {
            // EMAIL NOT FOUND ON DATA SOURCE
            _this.removeClass("disabled");
            this.$container.find('.reset-email-error').html("We couldn't find your email in our system. Please try again.");
            this.$container.find('.state[data-state=verify-email] .form-group').addClass('has-error');
            calculateElHeight(this.$container.find('.state[data-state=verify-email]'));
          } else {
            // EMAIL FOUND ON DATA SOURCE BUT IT'S NOT REGISTERED
            // MEANS NO PASSWORD FOUND
            _this.removeClass("disabled");
            this.$container.find('.reset-email-error').html("You don't seem to be registered in our system. Please try registering first.");
            this.$container.find('.state[data-state=verify-email] .form-group').addClass('has-error');
            calculateElHeight(this.$container.find('.state[data-state=verify-email]'));
          }

        });

      } else {
        // INVALID EMAIL
        _this.removeClass("disabled");
        this.$container.find('.reset-email-error').html("Please enter a valid email address and try again.");
        this.$container.find('.state[data-state=verify-email] .form-group').addClass('has-error');
        calculateElHeight(this.$container.find('.state[data-state=verify-email]'));
      }
    });

    this.$container.find('.back.start').on('click', function() {
      this.$container.find('.state.present').removeClass('present').addClass('future');

      this.$container.find('.reset-email-field').val(""); // RESETS EMAIL VALUE
      this.$container.find('.pin-code-field').val(""); // RESETS PIN

      // REMOVES ERROR MESSAGE ON CURRENT STATE IF THERE IS ONE
      if (this.$container.find('.state[data-state=verify-code] .form-group').hasClass('has-error')) {
        this.$container.find('.state[data-state=verify-code] .form-group').removeClass('has-error');
      }

      //check the validation current state.
      if (userDataPV.code !== "" && userDataPV.code_generated_at > Date.now() - (CODE_VALID * 60 * 1000)) {
        this.$container.find('.have-code').removeClass('hidden');
      }
      //this.$container.find('.verify-code').html("Verify").removeClass("disabled");
      this.$container.find('.authenticate').removeClass('loading');
      this.$container.find('.authenticate').find('span').removeClass('hidden');
      this.$container.find('.authenticate').find('.loader').removeClass('show');

      calculateElHeight(this.$container.find('.state[data-state=verify-email]'));
      this.$container.find('.state[data-state=verify-email]').removeClass('past').addClass('present');
    });

    this.$container.find('.have-code').on('click', function() {
      // TRANSITION
      this.$container.find('.state.present').removeClass('present').addClass('past');
      this.$container.find('.verify-user-email').text(userDataPV.email); // UPDATES TEXT WITH EMAIL

      calculateElHeight(this.$container.find('.state[data-state=verify-code]'));
      this.$container.find('.state[data-state=verify-code]').removeClass('future').addClass('present');
    });

    this.$container.find('.authenticate').on('click', function() {
    	var _this = $(this);

      this.$container.find('.pin-verify-error').addClass('hidden');
      this.$container.find('.pin-sent-error').addClass('hidden');
      // Simulates loading
      $(this).addClass('loading');
      $(this).find('span').addClass('hidden');
      $(this).find('.loader').addClass('show');

      var userPin = this.$container.find('.pin-code-field').val(),
          codeIsValid = userDataPV.code_generated_at > Date.now() - (CODE_VALID * 60 * 1000);

      // VERIFY PIN CODE
      if (userPin === userDataPV.code) {
        if (!codeIsValid) {
          this.$container.find('.state[data-state=verify-code] .form-group').addClass('has-error');
          this.$container.find('.resend-code').removeClass('hidden');
          _this.removeClass('loading');
          _this.find('span').removeClass('hidden');
          _this.find('.loader').removeClass('show');
          this.$container.find('.pin-verify-error').removeClass('hidden');
          calculateElHeight(this.$container.find('.state[data-state=verify-code]'));
        } else {
          if (this.$container.find('.state[data-state=verify-code] .form-group').hasClass('has-error')) {
            this.$container.find('.state[data-state=verify-code] .form-group').removeClass('has-error');
          }

          userDataPV.verified = true;
          userDataPV.code = "";
          userDataPV.code_generated_at = "";
          Fliplet.Security.Storage.update().then(function () {
            _this.removeClass('loading');
            _this.find('span').removeClass('hidden');
            _this.find('.loader').removeClass('show');

            this.$container.find('.state.present').removeClass('present').addClass('past');
            calculateElHeight(this.$container.find('.state[data-state=all-done]'));
            this.$container.find('.state[data-state=all-done]').removeClass('future').addClass('present');
          });
        }
      } else {
        _this.removeClass('loading');
        _this.find('span').removeClass('hidden');
        _this.find('.loader').removeClass('show');

        this.$container.find('.state[data-state=verify-code] .form-group').addClass('has-error');
        this.$container.find('.pin-verify-error').removeClass('hidden');
        calculateElHeight(this.$container.find('.state[data-state=verify-code]'));
      }
    });

    this.$container.find('.resend-code').on('click', function () {
      this.$container.find('.pin-sent-error').addClass('hidden');
      this.$container.find('.pin-sent-success').addClass('hidden');
      this.$container.find('.pin-code-field').val("");
      if (this.$container.find('.state[data-state=verify-code] .form-group').hasClass('has-error')) {
        this.$container.find('.state[data-state=verify-code] .form-group').removeClass('has-error');
      }
      if (!this.$container.find('.resend-code').hasClass('hidden')) {
        this.$container.find('.resend-code').addClass('hidden');
      }

      calculateElHeight(this.$container.find('.state[data-state=verify-code]'));

      sendNotification(emailAddress, function () {
        this.$container.find('.pin-code-field').val("");
        this.$container.find('.pin-sent-success').removeClass('hidden');
        if (this.$container.find('.state[data-state=verify-code] .form-group').hasClass('has-error')) {
          this.$container.find('.state[data-state=verify-code] .form-group').removeClass('has-error');
        }
        if (!this.$container.find('.resend-code').hasClass('hidden')) {
          this.$container.find('.resend-code').addClass('hidden');
        }
      }, function () {
        this.$container.find('.pin-sent-error').text(CONTACT_UNREACHABLE).removeClass("hidden");
      });
    });

    this.$container.find('.reset-continue').on('click', function () {
      if(typeof data.resetAction !== "undefined") {
        Fliplet.Navigate.to(data.resetAction);
      }
    });
  }

  function setUserDataPV(success_callback, fail_callback) {
    var structure = {
      verified: false,
      code: "",
      code_generated_at: "",
      email: ""
    };

    window.pvName = "user_data_" + Fliplet.Env.get('appId') + "_" + widgetId;
    Fliplet.Security.Storage.create(pvName, structure).then(function(data){
      window.userDataPV = data;
      success_callback();
    }, fail_callback);

  }

  if(Fliplet.Env.get('platform') === 'web') {

    $(document).ready(initEmailValidation);

    this.$container.on("fliplet_page_reloaded", initEmailValidation);
  } else {
    document.addEventListener("deviceready", initEmailValidation);
  }
});