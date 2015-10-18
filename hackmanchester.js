var hacks = new Mongo.Collection("hacks");
var challenges = new Mongo.Collection("challenges");
var teams = new Mongo.Collection("teams");

Router.configure({
  loadingTemplate: 'loading',
  notFoundTemplate: 'notFound',
  layoutTemplate: 'layout'
});

Router.map(function(){
  this.route('home',{
    path: '/'
  });
  this.route('hacks',{
    template:'allhacks',
    data: function(){
      return {hacks: hacks.find({})};
    }
  });
  this.route('myhacks',{
    path: '/hacks/my',
    template: 'myhacks',
    data: function() {
      return {hacks: hacks.find({owner:Meteor.userId()})};
    }
  });
  this.route('teams',{
    data: function() {
      var mapped = teams.find({}).map(function(t){
        var members = _.map(t.members, function(m){
          return Meteor.users.findOne({_id:m});
        });

        return {_id: t._id,name: t.name, members:members,hacks:hacks.find({team: t._id})};
      });

      return {teams:mapped};
    }
  });
  this.route('myteam',{
    data: function(){
      var myteam = teams.findOne({_id:Meteor.user().profile.team});

      var members = _.map(myteam.members, function(m){
        return Meteor.users.findOne({_id:m});
      });

      return {_id:myteam._id,name:myteam.name, members:members, hacks:hacks.find({team: myteam._id})};
    }
  });
  this.route('administration',{
    path:'/admin',
    data: function(){
      return { users: Meteor.users.find({})};
    }
  });
  this.route('judging');
  this.route('hack', {
    path: '/hack/:_id',
    data: function(){
      return hacks.findOne({ _id : this.params._id});
    }
  });
});

if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_EMAIL'
  });

  UI.registerHelper('trim250', function(context){
    if(context){
      return context.toString().substring(0, 250) + "...";
    }
  });

  UI.registerHelper('isJudge', function(){
    return Meteor.user().profile.isJudge;
  });

  UI.registerHelper('isAdmin', function(){
    return Meteor.user().profile.isAdmin;
  });

  UI.registerHelper('challenges', function(){
    return challenges.find();
  });

  UI.registerHelper('teamname', function(context){
    return teams.findOne({_id:context}).name;
  });

  Template.navigation.helpers({
    isActive: function(value){
      return Router.current().route.getName() == value ? 'active' : '';
    }
  });

  Template.home.helpers({
    hacks: function(){
      return hacks.find({},{$sort:{created:-1},limit:3})
    }
  });

  Template.showhacks.events({
    "submit .new-hack": function(event, template){
      event.preventDefault();

      var target = event.target;
      if(target.name.value === '' && target.team.value === '' && target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      var selected = template.findAll( "input[type=checkbox]:checked");

      var challenges = _.map(selected, function(item) {
        return item.defaultValue;
      });

      hacks.insert({
        name:target.name.value,
        team:Meteor.user().profile.team,
        description:target.description.value,
        owner:Meteor.userId(),
        created:new Date(),
        judgements: [],
        challenges:challenges
      });
      target.name.value = '';
      target.description.value = '';
    }
  });

  Template.hack.events({
    "submit .edit-hack": function(event, template){
      event.preventDefault();

      var target = event.target;
      if(target.name.value === '' && target.team.value === '' && target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      var selected = template.findAll( "input[type=checkbox]:checked");

      var challenges = _.map(selected, function(item) {
        return item.defaultValue;
      });

      hacks.update(this._id,{
        $set: {
          name: target.name.value,
          description: target.description.value,
          challenges:challenges
        }
      });
      Router.go('myhacks');
    },
    "submit .new-judgement": function(){
      event.preventDefault();

      var target = event.target;
      if(target.judgement.value === '' && !Meteor.user().isJudge) {
        Meteor.error("Values cannot be null!")
      }

      hacks.update(this._id,{
        $push: {
          judgements: {
            judgement: target.judgement.value,
            created: new Date(),
            judge: Meteor.userId()
          }
        }
      });
      target.judgement.value = '';
    }
  });

  Template.hackoverview.helpers({
    myHack: function(){
      return this.owner === Meteor.userId();
    },
    enteredChallenges: function(){
      if(this.challenges === undefined){
        return null;
      }

      return challenges.find({_id:{$in:this.challenges}});
    }
  });

  Template.hack.helpers({
    myHack: function(){
      return this.owner === Meteor.userId();
    },
    judgesComments: function(){
      return this.judgements.map(function(j){
        var judge = Meteor.users.findOne({_id: j.judge});
        return {
          judgement: j.judgement,
          created: moment(j.created).format('DD-MM-YYYY hh:mm'),
          judge: judge.username
        }
      });
    }
  });

  Template.entry.helpers({
    myChallenges: function(){
      var chals = this.challenges || [];
      return challenges.find().map(function(c){
        var entered = chals.indexOf(c._id) > -1;
        return {
          description: c.description,
          _id: c._id,
          entered:entered
        }
      });
    }
  });

  Template.team.events({
    "submit .join-team": function(){
      event.preventDefault();

      teams.update({_id:this._id},{$push:{members:Meteor.userId()}});

      Meteor.users.update(Meteor.userId(), { $set: {"profile.team": this._id} });
    }
  });

  Template.myteam.events({
    "submit .add-team": function(){
      event.preventDefault();
      var target = event.target;
      if(target.name.value === '') {
        Meteor.error("Values cannot be null!")
      }

      var team = teams.insert({name:target.name.value,members:[Meteor.userId()]});
      target.name.value = '';

      Meteor.users.update(Meteor.userId(), { $set: {"profile.team": team} });
    },
    "submit .leave-team": function(){
      event.preventDefault();

      teams.update({_id:this._id},{$pull:{members:Meteor.userId()}});
      Meteor.users.update(Meteor.userId(), { $unset: {"profile.team": ""} });
      Router.go('teams');
    }
  });

  Template.administration.events({
    "click .toggle-isjudge": function () {
      event.preventDefault();
      Meteor.call('setJudge', this._id, !this.isJudge);
    },
    "click .toggle-isadmin": function () {
      event.preventDefault();
      Meteor.call('setAdmin', this._id, !this.isAdmin);
    },
    "submit .new-challenge": function(){
      event.preventDefault();
      var target = event.target;
      if(target.challenge.value === '') {
        Meteor.error("Values cannot be null!")
      }

      challenges.insert({description:target.challenge.value});
      target.challenge.value = '';
    },
    "submit .edit-challenge": function(){
      event.preventDefault();
      var target = event.target;
      if(target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      challenges.update({_id:this._id},{description:target.description.value});
    },
    "click .delete": function(){
      event.preventDefault();
      challenges.remove({_id:this._id});
    }
  });

  Template.judging.helpers({
    hacks: function(){
      var challengeId = this._id;
      return hacks.find({challenges:{$in:[challengeId]}});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });

  Meteor.methods({
    setJudge: function(userId, isJudge) {
      Meteor.users.update(userId, {$set: {"profile.isJudge": isJudge}});
    },
    setAdmin: function(userId, isAdmin) {
      Meteor.users.update(userId, {$set: {"profile.isAdmin": isAdmin}});
    }
  });
}