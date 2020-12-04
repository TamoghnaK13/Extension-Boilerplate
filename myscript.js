var isRunning = false;
var isFinished = false;
var userName = null;
var profile = [];

function getCookie(name) {
     var cookieValue = null;
     if (document.cookie && document.cookie != '') {
         var cookies = document.cookie.split(';');
         for (var i = 0; i < cookies.length; i++) {
             var cookie = jQuery.trim(cookies[i]);
         if (cookie.substring(0, name.length + 1) == (name + '=')) {
             cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
             break;
         }
     }
 }
 return cookieValue;
}

function updateProgressbar(){
    var port = chrome.runtime.connect({name:"progressbar"});
    port.postMessage({msg: "progress", isRunning:isRunning, isFinished:isFinished});
}

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function pivot(arr) {
    var mp = new Map();

    function setValue(a, path, val) {
        if (Object(val) !== val) {
            var pathStr = path.join('.');
            var i = (mp.has(pathStr) ? mp : mp.set(pathStr, mp.size)).get(pathStr);
            a[i] = val;
        } else {
            for (var key in val) {
                setValue(a, key == '0' ? path : path.concat(key), val[key]);
            }
        }
        return a;
    }

    var result = arr.map(function (obj) {
        return setValue([], [], obj);
    });
    return [[].concat(_toConsumableArray(mp.keys()))].concat(_toConsumableArray(result));
}

function toCsv(arr) {
    return arr.map(function (row) {
        return row.map(function (val) {
            return isNaN(val) ? JSON.stringify(val) : +val;
        }).join(',');
    }).join('\n');
}

function exportCSV(data, name){
    var csv = toCsv(pivot(data))
    var pom = document.createElement('a');
    var csvContent=csv;
    var blob = new Blob([csvContent],{type: 'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    pom.href = url;
    pom.setAttribute('download', name);
    pom.click();
}

function getPeriod(jsonData, timePeriod){
    var stDate = timePeriod + ",startDate";
    var endDate = timePeriod + ",endDate";
    var startD = null;
    var endD = null;

    for(var t=0; t<jsonData.length; t++){
        if("$id" in jsonData[t] && jsonData[t]["$id"] == stDate){
            var month = jsonData[t]["month"]
            var year = jsonData[t]["year"]
            if (month){
                var startD = month + "/" + year
            } else {
                var startD = year
            }
        } else if ("$id" in jsonData[t] && jsonData[t]["$id"] == endDate){
            var month = jsonData[t]["month"]
            var year = jsonData[t]["year"]
            if (month){
                var endD = month + "/" + year
            } else {
                var endD = year
            }
        }
    }
    if (startD && endD){
        timePeriod = startD + " - " + endD
        return timePeriod
    } else if (startD && !endD){
        timePeriod = startD + " - " + "Present"
        return timePeriod
    }
    return ""
}

function getEndorses(jsonData, entity){
    for(var i=0; i<jsonData.length; i++){
        if("skill" in jsonData[i] && jsonData[i]["skill"] == entity){
            var endorsementCount = jsonData[i]["endorsementCount"]
            return endorsementCount
        }
    }
}


function getRecomendor(jsonData, entity){
    for(var i=0; i<jsonData.length; i++){
        if("entityUrn" in jsonData[i] && jsonData[i]["entityUrn"] == entity){
            var fullName = jsonData[i]["firstName"] + " " + jsonData[i]["lastName"];
            var occupation = jsonData[i]["occupation"]
            var id = "https://www.linkedin.com/in/" + jsonData[i]["publicIdentifier"]
            var recommender = {
                "Name": fullName,
                "Occupation": occupation,
                "Id": id
            }
            return recommender
        }
    }
}

function getProfilePic(jsonData, entity){
    for(var i=0; i<jsonData.length; i++){
        if("$id" in jsonData[i] && jsonData[i]["$id"]==entity){
            var masterImage = "https://media.licdn.com/media/" + jsonData[i]["masterImage"];
            return masterImage
        }
    }
}

function parseSkills(user, headers){
    var url = "https://www.linkedin.com/voyager/api/identity/profiles/" + user +"/featuredSkills?includeHiddenEndorsers=true&count=50";
    var path = "/voyager/api/identity/profiles/" + user +"/featuredSkills?includeHiddenEndorsers=true&count=50";
    headers["path"] = path;
    $.ajax({
      url: url,
      headers: headers,
      success: function(data) {
        var jsonData = data['included']
        for(var e=0; e<jsonData.length; e++){
            if ("name" in jsonData[e] && "entityUrn" in jsonData[e]){
                var name = jsonData[e]["name"];
                var entity = jsonData[e]["entityUrn"]
                var endorsementCount = getEndorses(jsonData, entity)
                var skillData = {
                    "Name": name,
                    "Total Endorsement": endorsementCount
                }
                profile[0]["Skills"].push(skillData)
            }
        }
      }
    });
}

function parseRecommendations(user, headers){
    var url = "https://www.linkedin.com/voyager/api/identity/profiles/" + user + "/recommendations?q=received&recommendationStatuses=List(VISIBLE)";
    var path = "/voyager/api/identity/profiles/" + user + "/recommendations?q=received&recommendationStatuses=List(VISIBLE)";
    headers["path"] = path;
    $.ajax({
      url: url,
      headers: headers,
      success: function(data) {
        var jsonData = data['included']
        for(var e=0; e<jsonData.length; e++){
            if("recommender" in jsonData[e]){
                var recommender = jsonData[e]["recommender"];
                var recommendationText = jsonData[e]["recommendationText"]
                var relationship = jsonData[e]["relationship"]
                recommender = getRecomendor(jsonData, recommender)
                recommender["Recommendation Text"] = recommendationText
                profile[0]['Recommendations'].push(recommender)
            }
        }
      }
    });
}

function parseInterests(user, headers){
    var url = "https://www.linkedin.com/voyager/api/identity/profiles/" + user + "/following?count=100&q=followedEntities";
    var path = "/voyager/api/identity/profiles/" + user +"/following?count=7&q=followedEntities";
    headers["path"] = path;
    $.ajax({
      url: url,
      headers: headers,
      success: function(data) {
        var jsonData = data['included']
        for(var e=0; e<jsonData.length; e++){
            if("name" in jsonData[e] || "groupName" in jsonData[e]){
                var name = jsonData[e]["name"];
                var groupName = jsonData[e]["groupName"];
                var groupDescription = jsonData[e]["groupDescription"];
                if (groupName){
                    var interestData = {
                        "Name": groupName,
                        "Group Description": groupDescription
                    }
                } else {
                    var interestData = {
                        "Name": name
                    }
                }
                profile[0]["Interests"].push(interestData);
            }
        }
      }
    });
}

function parseContacts(user, headers){
    var url = "https://www.linkedin.com/voyager/api/identity/profiles/" + user + "/profileContactInfo";
    var path = "/voyager/api/identity/profiles/" + user + "/profileContactInfo";
    headers["path"] = path;
    $.ajax({
      url: url,
      headers: headers,
      success: function(data) {
        var email = data["data"]["emailAddress"]
        profile[0]["Contacts"]["Email"] = email;
        jsonData = data["included"];
        for(var e=0; e<jsonData.length; e++){
            if ("provider" in jsonData[e] && jsonData[e]["provider"] == "SKYPE"){
                var skypeId = jsonData[e]["id"]
                profile[0]["Contacts"]["Skype"] = skypeId;
            }

            if("type" in jsonData[e] && jsonData[e]["type"] == "MOBILE"){
                var mobileNumber = jsonData[e]["number"]
                profile[0]["Contacts"]["Phone"] = mobileNumber;
            }

            if("url" in jsonData[e]){
                var website = jsonData[e]["url"]
                profile[0]["Contacts"]["Website"] = website;
            }
        }
      }
    });
}

function parseConnections(userEntity, count, headers){
    count = Math.round(Number(count/10))
    var k = 1;
    function getConnections() {
        var url = "https://www.linkedin.com/search/results/people/?facetConnectionOf=%5B%22"+ userEntity + "%22%5D&facetNetwork=%5B%22F%22%2C%22S%22%5D&origin=MEMBER_PROFILE_CANNED_SEARCH" + "&page=" + k;
        $.ajax({
            url: url,
            headers: headers,
            success: function(data) {
                var html = new DOMParser().parseFromString(data, "text/html");
                html  = html.querySelectorAll("code");
                for(var c=0; c<html.length; c++){
                    if (html[c].textContent.includes('urlParameter')){
                        var jsonData = JSON.parse(html[c].textContent)
                        jsonData  = jsonData['included'];
                        for(var e=0; e<jsonData.length; e++){
                            if("occupation" in jsonData[e]){
                                var fullName = jsonData[e]['firstName'] + " " + jsonData[e]['lastName'];
                                var occupation = jsonData[e]["occupation"];
                                var object = jsonData[e]["entityUrn"];
                                var linkedinId = "https://www.linkedin.com/in/" + jsonData[e]["publicIdentifier"];
                                var connectionData = {
                                    "Name": fullName,
                                    "Occupation": occupation,
                                    "Id": linkedinId
                                }
                                console.log("Connection", connectionData)
                                profile[0]["Connections"].push(connectionData)
                            }  
                        }
                    }
                }
                k ++; 
                if(k<=count){
                    getConnections()
                } else {
                    var filename = userName+'.csv';
                    exportCSV(profile, filename);
                    $.ajax
                        ({
                            type: "POST",
                            url: 'https://www.outvote.io/api/contacts/upload_facebook/',
                            contentType : 'application/json',
                            data: JSON.stringify({'data':profile[0]}),
                            success: function () {
                                console.log("Done!")
                        }
                    })
                    isFinished= true;
                    isRunning = false;
                    console.log(profile);
                }
            }
        });
    }
    getConnections()
}


function startCrawling() {
    var url  = window.location.href;
    var user = url.split("/").slice(-2)[0]
    userName = user;

    var profileData = {
        "Profile": url,
        "Name": "",
        "Headline": "",
        "Summary": "",
        "Location": "",
        "Profile Picture": "",
        "Contacts": {},
        "Educations": [],
        "Experiences": [],
        "Projects": [],
        "Skills": [],
        "Recommendations":[],
        "Interests": [],
        "Connections":[]
    };

    profile.push(profileData)
    csrftoken = getCookie("JSESSIONID");

    var headers = {
        'authority':'www.linkedin.com',
        'method':'GET',
        'scheme':'https',
        'accept':'application/vnd.linkedin.normalized+json',
        'accept-language':'en-US,en;q=0.8,hi;q=0.6,bn;q=0.4',
        'csrf-token':csrftoken.replace(/"/g, ""),
    }

    $.ajax({
      url: url,
      headers: headers,
      success: function(data) {
            var html = new DOMParser().parseFromString(data, "text/html");
            html  = html.querySelectorAll("code");
            for(var i=0; i<html.length; i++){
                if (html[i].textContent.includes('schoolName')){
                    var jsonData = JSON.parse(html[i].textContent)
                    jsonData  = jsonData['included'];
                    for(var e=0; e<jsonData.length; e++){
                        if("degreeName" in jsonData[e]){
                            var degree = jsonData[e]['degreeName'];
                            var school = jsonData[e]['schoolName'];
                            var fieldOfStudy = jsonData[e]['fieldOfStudy'];
                            var educationTimePeriod = jsonData[e]['timePeriod'];
                            educationTimePeriod = getPeriod(jsonData, educationTimePeriod)

                            var educationData = {
                                "Degree": degree,
                                "School": school,
                                "Field Of Study": fieldOfStudy,
                                "Time Period": educationTimePeriod
                            }
                            console.log("Education", educationData)
                            profile[0]["Educations"].push(educationData)

                        }
                        if ("companyName" in jsonData[e]){
                            var companyName = jsonData[e]['companyName'];
                            var title = jsonData[e]['title'];
                            var locationName = jsonData[e]['locationName']||"";
                            var experienceTimePeriod = jsonData[e]['timePeriod'];
                            var description = jsonData[e]['description'];
                            experienceTimePeriod = getPeriod(jsonData, experienceTimePeriod)

                            var experiencData = {
                                "Company": companyName,
                                "Job Title": title,
                                "Location": locationName,
                                "Description": description,
                                "Time Period": experienceTimePeriod
                            }
                            console.log("Experience", experiencData)
                            profile[0]["Experiences"].push(experiencData)
                        }

                        if("$type" in jsonData[e] && jsonData[e]["$type"] == "com.linkedin.voyager.identity.profile.Project"){
                            var projectTitle = jsonData[e]['title'];
                            var projectDescription = jsonData[e]['description'];
                            var projecttimePeriod = jsonData[e]['timePeriod'];
                            projecttimePeriod = getPeriod(jsonData, projecttimePeriod)
                            var projectData = {
                                "Title": projectTitle,
                                "Description": projectDescription,
                                "Time Period": projecttimePeriod
                            }
                            profile[0]["Projects"].push(projectData)
                        }

                        if ("headline" in jsonData[e]){
                            var name = jsonData[e]['firstName'] + " " +  jsonData[e]['lastName'];
                            var headline = jsonData[e]['headline'];
                            var summary = jsonData[e]['summary'];
                            var locationName = jsonData[e]['locationName'];
                            var industryName = jsonData[e]['industryName'];
                            var picture =  jsonData[e]['pictureInfo']; 
                            picture = getProfilePic(jsonData, picture)

                            profile[0]["Name"] = name
                            profile[0]["Headline"] = headline
                            profile[0]["Summary"] = summary
                            profile[0]["Profile Picture"] = picture
                            profile[0]["Location"] = locationName
                        }
                    }
                } else if(html[i].textContent.includes('connectionsCount')){
                    var jsonData = JSON.parse(html[i].textContent)
                    jsonData  = jsonData['data'];
                    var connectionCount = jsonData["connectionsCount"]
                    var userEntity = jsonData["entityUrn"];
                    userEntity = userEntity.split(":").slice(-1)[0];
                    console.log(connectionCount, userEntity)
                    if (connectionCount>0){
                        parseConnections(userEntity, connectionCount, headers);
                    } else {
                        setTimeout(function(){ 
                        var filename = userName+'.csv';
                        exportCSV(profile, filename);
                        $.ajax
                            ({
                                type: "POST",
                                url: 'https://www.outvote.io/api/contacts/upload_facebook/',
                                contentType : 'application/json',
                                data: JSON.stringify({'data':profile[0]}),
                                success: function () {
                                   console.log("Done!")
                            }
                        })
                            isFinished= true;
                            isRunning = false;
                        }, 20000);
                    }
                }
            }
        }
    });

    parseSkills(user, headers);
    parseContacts(user, headers);
    parseRecommendations(user, headers);
    parseInterests(user, headers);
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg == "start") {
        isRunning = true;
        isFinished = false;
        profile = [];
        startCrawling()
    }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg=="download" && profile.length>0){
        var filename = userName+'.csv';
        exportCSV(profile, filename);
    } else if (request.msg=="download") {
        alert("There is no data to download.Please click on start button before download");
    }
});

setInterval(function(){ updateProgressbar(); }, 200);
updateProgressbar()

