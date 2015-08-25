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

  Template.home.helpers({
    hacks: function(){
      return hacks.find({},{$sort:{created:-1}})
    }
  })

  Template.hacks.events({
    "submit .new-hack": function(){
      event.preventDefault();

      var target = event.target;
      if(target.name.value === '' && target.team.value === '' && target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      var id = hacks.insert({
        name:target.name.value,
        team:target.team.value,
        description:target.description.value,
        owner:Meteor.userId(),
        created:new Date()
      });
      target.name.value = '';
      target.team.value = '';
      target.description.value = '';
      //Router.go('hack', {_id: id});
    }
  });

  Template.hacks.helpers({
    hacks: function(){
      return hacks.find({});
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
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
