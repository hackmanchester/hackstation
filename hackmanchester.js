Router.configure({
  loadingTemplate: 'loading',
  notFoundTemplate: 'notFound',
  layoutTemplate: 'layout'
});

Router.map(function(){
  this.route('home',{
    path: '/'
  });
  this.route('hacks');
  this.route('administration',{
    path:'/admin'
  });
  this.route('judging');
  this.route('myhacks',{
    path: '/hacks/my'
  });
  this.route('hack', {
    path: '/hack/:_id',
    data: function(){
      return hacks.findOne({ _id : this.params._id});
    }
  });
});

var hacks = new Mongo.Collection("hacks");
var challenges = new Mongo.Collection("challenges");

if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

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

  Template.hacks.helpers({
    hacks: function(){
      return hacks.find({});
    }
  });

  Template.hacks.events({
    "submit .new-hack": function(){
      event.preventDefault();

      var target = event.target;
      if(target.name.value === '' && target.team.value === '' && target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      hacks.insert({
        name:target.name.value,
        team:target.team.value,
        description:target.description.value,
        owner:Meteor.userId(),
        created:new Date(),
        judgements: []
      });
      target.name.value = '';
      target.team.value = '';
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
          team: target.team.value,
          description: target.description.value,
          challenges:challenges
        }
      });
      Router.go('myhacks');
    },
    "submit .new-judgement": function(){
      event.preventDefault();

      var target = event.target;
      if(target.judgement.value === '' && !Meteor.user().profile.isJudge) {
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
        var name = '';
        if(judge.profile !== undefined && judge.profile.name !== undefined) {
          name = judge.profile.name;
        }
        else {
          name = 'No name specified!';
        }
        return {
          judgement: j.judgement,
          created: moment(j.created).format('DD-MM-YYYY hh:mm'),
          judge: name
        }
      });
    }
  });

  Template.modifyentry.helpers({
    myChallenges: function(){
      var chals = this.challenges;
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

  Template.myhacks.helpers({
    hacks: function() {
      return hacks.find({owner:Meteor.userId()});
    }
  });

  Template.administration.helpers({
    users: function(){
      return Meteor.users.find({});
    }
  });

  Template.administration.events({
    "click .toggle-isjudge": function () {
      event.preventDefault();
      Meteor.call('setJudge', this._id, !this.profile.isJudge);
    },
    "click .toggle-isadmin": function () {
      event.preventDefault();
      Meteor.call('setAdmin', this._id, !this.profile.isAdmin);
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
      Meteor.users.update(userId, {
        $set: {
          "profile.isJudge": isJudge
        }
      });
    },
    setAdmin: function(userId, isAdmin) {
      Meteor.users.update(userId, {
        $set: {
          "profile.isAdmin": isAdmin
        }
      });
    }
  });
}
