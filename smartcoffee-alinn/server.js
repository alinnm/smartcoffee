var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
users = [];
connections = [];
const port = process.env.PORT || 8000;
const { Client } = require('pg');
const connectionString = '//your path to db';
const client = new Client({
    connectionString: connectionString
});
client.connect();


server.listen(port);
console.log('Server running')

app.get('/',function (req, res) {
    res.sendFile(__dirname + '/index.html')
});

io.sockets.on('connection', function (socket) {
    var x = socket.id;
    connections.push(x);
    console.log("connections ids: ",connections);
    //console.log(socket)
    
    


    socket.on('disconnect', function (socket) {
        console.log('data: %s', socket)
        connections.splice(connections.indexOf(socket),1);
        console.log(connections);

    });

    socket.on('esp_init', function (data) {
        console.log('new mesg from esp: ' + data.username, data.mac);
        var username = data.username;
        var mac = data.mac;
        var status = data.status;
        try {
            
            client.query("select * from devices where macadress=$1",[mac], function(error, result){
                    if (error){
                        console.log(error);
                    }
                    if(result.rowCount>0){
                        console.log(result.rows[0].macadress);
                        if (result.rows[0].macadress==mac){
                            try {
                                 client.query("update devices set status =($1), linked = ($2),linked_user = ($3) where macadress=$4",["on","yes",username,mac], function(error){
                                     if(error){
                                         console.log(error);
                                     }else{
                                        console.log("devices updated");
                                     }

                                 });
                                 
                            } catch (error) {
                            
                            }
                           
                            
                        }    
                    }    
                    else if(result.rowCount==0){
                        console.log("macadress undefinied");
                        try {
                            client.query("insert into devices (macadress,status,linked,linked_user)values($1,$2,$3,$4)",[mac,"on","yes",username], function (err, result) {
                                if (err) {
                                    console.log(err);
                                    
                                    }
                                else{
                                    io.sockets.emit('addDevice', { message: "addDeviceOK" }); 
                                }    console.log("devices inserted");
                            });
                            
                        } catch (error) {
                            
                        }    

                    }    

            });
            
            
            

        } catch (error) {
            
        }
        
        try {
            
            client.query("select * from connections where mac=$1",[mac], function(error, result){
                    if (error){
                        console.log(error);
                    }
                    if(result.rowCount>0){
                        console.log(result.rows[0].mac);
                        if (result.rows[0].mac==mac){
                            var command = result.rows[0].standby;
                            if (command=="on"){io.sockets.emit('msgfromapk', { msg: "start"});}
                            else if (command=="off"){io.sockets.emit('msgfromapk', { msg: "stop"});}
                            try {
                                 client.query("update connections set connect_user =($1) where mac=$2",[username,mac], function(error){
                                     if(error){
                                         console.log(error);
                                     }else{
                                         console.log("connection updated");
                                     }
                                 });
                                 
                            } catch (error) {
                            
                            }
                            
                            
                        }    
                    }    
                    else if(result.rowCount==0){
                        console.log("mac undefinied");
                        try {
                            client.query("insert into connections (mac,connect_user,standby,heating,makescoffee,makelcoffee,ready,error)values($1,$2,$3,$4,$5,$6,$7,$8)",
                            [mac,username,"false","false",status,"false","true","false"], function (err, result) {
                                if (err) {
                                    console.log(err);
                                    
                                    }
                                else{
                                   console.log("connections inserted"); 
                                }    
                            });
                            
                        } catch (error) {
                            
                        }    

                    }    

            });
            
            
            

        } catch (error) {
            
        }
    });
    socket.on('DelAcc',function(data){
        console.log("delaccount :" + data.username);
        var username = data.username;
        try {
            client.query("delete from users where username = $1",[username],function(error){
                if(error){
                    console.log(error);
                }else{
                io.sockets.emit('DelAccAnswer', { message: "deleteOK" });        
                }    
            });
        } catch (error) {
            
        }
        try {
            client.query("delete from devices where linked_user = $1", [username], function(error){
                if(error){
                    console.log(error);
                }
            });
        } catch (error) {
            
        }
        try {
            client.query("delete from connections where connect_user = $1",[username],function(error){
                if(error){
                    console.log(error);
                }
            });
                    
            
            
        } catch (error) {
            
        }
    });
    socket.on('apk', function (data) {
        console.log('new mesg from apk: ' + data.msg);
        if(data.msg=="reset"){
            io.sockets.emit('dataAnswer', { message: "resetOK" });
        }
        
        io.sockets.emit('msgfromapk', { msg: data.msg });
        
    });
    socket.on('login', function (data) {
        console.log('new mesg from application: ' + data);
        const obj= JSON.parse(data)
        var username = obj['username'];
        var password = obj['password'];
        try {
            
            client.query('SELECT * FROM users where username=$1 ',[username], function (err, result) {
                if (err) {
                    console.log(err);
                    
                }
                if(result){
                    var resultUsername = result.rows[0].username;
                    var resultPassword = result.rows[0].password;
                    if(resultUsername == username & resultPassword == password){
                        io.sockets.emit('loginAnswer', { message: "loginOK" });    
                    }
                    else{
                        io.sockets.emit('ApkError', { message: "Wrong user or password" });
                    }
                }
                else if(result.lengh==0){
                    io.sockets.emit('ApkError', { message: "User not registered" });
                }
    
            });
        } catch (error) {
            
        }

        
    });
    socket.on('registerData',function(data){
        console.log("new register data arrived :",data);
        var username = data['username'];
        var password = data['password'];
        var email = data['email'];
        try {
            client.query("select *from users" , function(error,result){
                
                if (error) {
                    console.log(error);
                    io.sockets.emit('registerError',{message:error});
                }
                if(result.rowCount>0){
                    console.log(result.rows[0].username);
                    if (result.rows[0].username == username){
                        console.log(username +" is already taken");
                        io.sockets.emit('registerError', {message:username +" is already taken"});
                        } 
                }    
                else if(result.rowCount==0){
                    console.log("username undefinied");
                        
                    client.query("insert into users (username,password,email)values($1,$2,$3)",[username,password,email], function (err, result) {
                        if (err) {
                            console.log(err);
                            }
                        else{
                            io.sockets.emit('registerFeedback', { message: "registerOK" });
                        }    
                    });
                   
                }
                
               
                
            });
            
        } catch (error) {
            console.log("error: ",error)
        }
    });

    socket.on('statusData',function(data){
        var mac = data.mac;
        var status = data.status;
        try {
            client.query("update connections set standby=($1) where mac=$2",[status,mac], function(error){
                if(error){
                    console.log(error);
                }else{
                    console.log("connection updated");
                }
            });
            
       } catch (error) {
       
       }

        io.sockets.emit('statusEspAnswer',{message:status});

    });

    socket.on('status',function(data){
        var username = data["msg"];
        console.log("new esp status request username: "+ username);
        console.log(username); 
        try {
            client.query("select * from connections where connect_user = $1",[username],function(error,result){
                    
                if(error){
                    console.log(error);
                }
                if(result.rowCount>0){
                    var status = result.rows[0].standby;
                    console.log(status);
                    io.sockets.emit("statusEspAnswer",{message:status});
                }
            });
        } catch (error) {
            
        }
        

    });
});

