var hacks = new Mongo.Collection("hacks");
var challenges = new Mongo.Collection("challenges");
var teams = new Mongo.Collection("teams");
var tech = new Mongo.Collection("tech");

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
      return {hacks: hacks.find({team:Meteor.user().profile.team})};
    }
  });
  this.route('teams',{
    data: function() {
      var mapped = teams.find({}).map(function(t){
        var members = _.map(t.members, function(m){
          return Meteor.users.findOne({_id:m});
        });

        return {_id: t._id,name: t.name, members:members,hacks:hacks.find({team: t._id}),table: t.table};
      });

      return {teams:mapped};
    }
  });
  this.route('team', {
    path:'/team/:_id',
    data: function(){
      var myteam = teams.findOne({_id:this.params._id});

      var members = _.map(myteam.members, function(m){
        return Meteor.users.findOne({_id:m});
      });

      return {_id:myteam._id,name:myteam.name, members:members, hacks:hacks.find({team: myteam._id}),table: myteam.table};
    }
  });
  this.route('myteam',{
    template:'team',
    data: function(){
      var myteam = teams.findOne({_id:Meteor.user().profile.team});

      var members = _.map(myteam.members, function(m){
        return Meteor.users.findOne({_id:m});
      });

      return {_id:myteam._id,name:myteam.name, members:members, hacks:hacks.find({team: myteam._id}),table: myteam.table};
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

  UI.registerHelper('technologies', function(){
    return tech.find();
  });

  UI.registerHelper('teamname', function(context){
    return teams.findOne({_id:context}).name;
  });

  UI.registerHelper('ismyteam', function(context){
    return Meteor.user().profile.team === context;
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

      var selectedtech = template.findAll("div.menu div.active");

      var techchoices = _.map(selectedtech, function(item){
        return item.attributes["data-value"].value;
      });

      hacks.insert({
        name:target.name.value,
        team:Meteor.user().profile.team,
        description:target.description.value,
        youtube:target.youtube.value,
        hackurl:target.hackurl.value,
        created:new Date(),
        judgements: [],
        challenges:challenges,
        techchoices: techchoices
      });
      target.name.value = '';
      target.description.value = '';
      target.youtube.value = '';
      target.table.value = '';
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

      var selectedtech = template.findAll("div.menu div.active");

      var techchoices = _.map(selectedtech, function(item){
        return item.attributes["data-value"].value;
      });

      hacks.update(this._id,{
        $set: {
          name: target.name.value,
          description: target.description.value,
          youtube:target.youtube.value,
          hackurl:target.hack.value,
          challenges:challenges,
          techchoices: techchoices
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
      return this.team === Meteor.user().profile.team;
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
      return this.team === Meteor.user().profile.team;
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

  Template.hack.events({
    "submit .delete-hack": function(){
      event.preventDefault();
      hacks.remove({_id:this._id});
      Router.go('hacks');
    }
  })

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
    },
    myTechnologies: function(){
      var techs = this.techchoices || [];
      return tech.find().map(function(c){
        var selected = techs.indexOf(c._id) > -1;
        return {
          description: c.description,
          _id: c._id,
          selected:selected
        }
      });
    }
  });

  Template.entry.events({
    "click #add-tag": function(event, template){
      event.preventDefault();

      var tag = template.find("[name=tag]").value;

      if(tag.length === 0) return;

      Meteor.call("saveTag", tag);
      template.find("[name=tag]").value = '';
    }
  });

  Template.entry.onRendered(
      function(){
      $('.dropdown').dropdown({ transition: 'drop' });
    }
  );

  Template.teamoverview.events({
    "submit .join-team": function(){
      event.preventDefault();

      teams.update({_id:this._id},{$push:{members:Meteor.userId()}});

      Meteor.users.update(Meteor.userId(), { $set: {"profile.team": this._id} });
    }
  });

  Template.team.events({
    "submit .add-team": function(){
      event.preventDefault();
      var target = event.target;
      if(target.name.value === '') {
        Meteor.error("Values cannot be null!")
      }

      var team = teams.insert({
        name:target.name.value,
        members:[Meteor.userId()],
        table:target.table.value
      });
      target.name.value = '';
      target.table.value = '';

      Meteor.users.update(Meteor.userId(), { $set: {"profile.team": team} });
    },
    "submit .edit-team": function(){
      event.preventDefault();
      var target = event.target;
      if(target.name.value === '') {
        Meteor.error("Values cannot be null!")
      }

      teams.update({_id:this._id},{$set:{
        name:target.name.value,
        table:target.table.value
      }});
      Router.go('teams');
    },
    "submit .leave-team": function(){
      event.preventDefault();

      teams.update({_id:this._id},{$pull:{members:Meteor.userId()}});
      Meteor.users.update(Meteor.userId(), { $unset: {"profile.team": ""} });
      Router.go('teams');
    },
    "submit .delete-team": function(){
      event.preventDefault();
      Meteor.call('deleteTeam', this._id);
      Router.go('teams');
    }
  });

  Template.administration.events({
    "click .toggle-isjudge": function () {
      event.preventDefault();
      Meteor.call('setJudge', this._id, event.target.checked);
    },
    "click .toggle-isadmin": function () {
      event.preventDefault();
      Meteor.call('setAdmin', this._id, event.target.checked);
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
    "click .delete-challenge": function(){
      event.preventDefault();
      challenges.remove({_id:this._id});
    }
    ,
    "submit .new-tech": function(){
      event.preventDefault();
      var target = event.target;
      if(target.tech.value === '') {
        Meteor.error("Values cannot be null!")
      }

      tech.insert({description:target.tech.value});
      target.tech.value = '';
    },
    "submit .edit-tech": function(){
      event.preventDefault();
      var target = event.target;
      if(target.description.value === '') {
        Meteor.error("Values cannot be null!")
      }

      tech.update({_id:this._id},{description:target.description.value});
    },
    "click .delete-tech": function(){
      event.preventDefault();
      tech.remove({_id:this._id});
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
    },
    saveTag: function(tag) {
      tech.upsert({description:tag},{description:tag});
    },
    deleteTeam: function(team){
      hacks.remove({team:team});
      Meteor.users.update({"profile.team":team}, { $unset: {"profile.team": ""} },{multi:true});
      teams.remove({_id:team});
    }
  });
}