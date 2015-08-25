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

  Template.navigation.helpers({
    judge: function(){
      return Meteor.user().profile.isJudge;
    }
  })

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
        created:new Date()
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
    }
  });

  Template.hackOverview.helpers({
    myHack: function(){
      return this.owner === Meteor.userId();
    }
  });

  Template.hack.helpers({
    myHack: function(){
      return this.owner === Meteor.userId();
    }
  });

  Template.myhacks.helpers({
    hacks: function() {
      return hacks.find({owner:Meteor.userId()});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
