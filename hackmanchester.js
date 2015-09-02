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

if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

  UI.registerHelper('trim250', function(context, options){
    if(context){
      return context.toString().substring(0, 250) + "...";
    }
  });

  UI.registerHelper('isJudge', function(context, options){
    return Meteor.user().profile.isJudge;
  });

  UI.registerHelper('isAdmin', function(context, options){
    return Meteor.user().profile.isJudge;
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
    "submit .edit-hack": function(){
      event.preventDefault();

      var target = event.target;
      if(target.name.value === '' && target.team.value === '' && target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      hacks.update(this._id,{
        $set: {
          name: target.name.value,
          team: target.team.value,
          description: target.description.value
        }
      });
      Router.go('myHacks');
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

  Template.myhacks.helpers({
    hacks: function() {
      return hacks.find({owner:Meteor.userId()});
    }
  });

  Template.administration.helpers({
    users: function(){
      return Meteor.users.find({});
    }
  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
