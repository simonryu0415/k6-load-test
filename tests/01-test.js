import { check, group } from "k6";
import { Trend } from "k6/metrics"
import http from "k6/http";
import jsonpath from "https://jslib.k6.io/jsonpath/1.0.2/index.js";
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// // Helper function to calculate ISO week number
// Date.prototype.getWeekNumber = function(){
//   var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
//   var dayNum = d.getUTCDay() || 7;
//   d.setUTCDate(d.getUTCDate() + 4 - dayNum);
//   var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
//   return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
// };

export function handleSummary(data) {
    return { 
      'stdout': textSummary(data, { indent: ' ', enableColors: true}),
      'test_summary.json': JSON.stringify(data, null, 2),
    };
};

// Define virtual user traffic staging and thresholds
export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate < 0.01'],
    http_req_duration: ['p(95) < 3000'],
  },
};

let authTrend = new Trend('auth_duration');
// Zone metrics
let getFarmPhaseSeverityCountTrend = new Trend('custom_zone-get_farm_phase_sev_count');
let getAllZonesForAPhaseTrend = new Trend('custom_zone-get_all_zones_for_a_phase');
let getZoneByZoneIdTrend = new Trend('custom_zone-get_zone_by_zone_id');
let getZoneGraphDataTrend = new Trend('custom_zone-get_zone_graph_data');

// Crop configuration metrics
let getCropListTrend = new Trend("custom_crop-get_crop_list");
let getAllCropsinPhaseTrend = new Trend("custom_crop-get_all_crops_in_phase")

// // Definte time range for getZoneGraphData
// let currentISOWeek = new Date().getWeekNumber();
// let currentYear = new Date().getFullYear();
// let startDate = new Date();
// startDate.setDate(startDate.getDate()-70);
// let startISOWeek = startDate.getWeekNumber();
// let startYear = startDate.getFullYear();

export default function () {
  let response;
  const URL = 'https://api-stage.ecoationsvc.io';
  const cred = '{"email":"mucci_support@ecoation.com","password":"!Ecoation1"}';
  const vars = {};  

  // Authentication
  response = http.post(
    `${URL}/auth/login`, cred,
    {
      headers: {
        authorization: "undefined",
        "content-type": "application/json",
        "sec-ch-ua":
          '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
        "sec-ch-ua-mobile": "?0",
      },
    }
  );
  authTrend.add(response.timings.duration)
  check(response, {
    "is status 201": (r) => r.status === 201,
  });

  vars["accessToken"] = jsonpath.query(
    response.json(),
    "$.auth.accessToken"
  )[0];
  vars["defaultPhase"] = jsonpath.query(response.json(), "$.phaseId")[0];
  vars["timezone"] = jsonpath.query(response.json(), "$.timezone")[0];
  vars["date"] = jsonpath.query(response.json(), "$.date")[0];
  vars["farmId"] = jsonpath.query(
    response.json(),
    "$.phases['41e09f4a-4797-4cf9-abfd-d43eb8317401'].farmId"
  )[0];

  let headers = {
    Authorization: `Bearer ${vars["accessToken"]}`,
    'Content-Type': 'application/json',
  };

  group ('Zone', function() {  
    // GetFarmPhaseSeverityCount
    let getFarmPhaseZoneSeverity = `
      query {
        getFarmPhaseZoneSeverity(
            phaseId: "${vars["defaultPhase"]}"
            ){
                severity
                count
            }
      }`
    response = http.post(`${URL}/graphql`, JSON.stringify({ query: getFarmPhaseZoneSeverity }), { headers: headers });
    getFarmPhaseSeverityCountTrend.add(response.timings.duration)
    check(response, {
      "is status 200": (r) => r.status === 200,
    });
    if (response.status === 200) {
      // console.log(JSON.stringify(response.body));
      let body = JSON.parse(response.body);
      let issue = body.data.getFarmPhaseZoneSeverity[0]
      // console.log(JSON.stringify(issue))
    }
  
    // getAllZonesForAPhase 
    let getAllZonesForAPhase = `
      query {
        getAllZonesForAPhase(
          phaseId: "${vars["defaultPhase"]}"
          ) {
              id
              displayName
              typeId
              typeName
              phaseId
              posts
              status
              severity
              issueCount
              isCustomerAvailable
              zoneCategoryStatuses{
                  eventSubCategoryId
                  severity
                  title
                  description
                  imageUrl
                }
            }
      }`;
    response = http.post(`${URL}/graphql`, JSON.stringify({ query: getAllZonesForAPhase }), { headers: headers });
    getAllZonesForAPhaseTrend.add(response.timings.duration);
    check(response, {
      "is status 200": (r) => r.status === 200,
    });
    // console.log(response.body)
    if (response.status === 200) {
      let body = JSON.parse(response.body).data.getAllZonesForAPhase;
      for (const zone of body) {
        // getZoneByZoneId
        let getZoneByZoneId = `
          query {
            getZoneByZoneId(
              phaseId: "${vars["defaultPhase"]}"
              zoneId: "${zone.id}"
              ){
                  id
                  displayName
                  typeId
                  typeName
                  phaseId
                  posts
                  status
                  severity
                  issueCount
                  isCustomerAvailable
                  coverage{
                      percentage
                      showBanner
                  }
                  zoneCategoryStatuses{
                      eventSubCategoryId
                      severity
                      title
                      description
                      imageUrl
                  }
            }
          }`
        response = http.post(`${URL}/graphql`, JSON.stringify({ query: getZoneByZoneId }), { headers: headers });
        getZoneByZoneIdTrend.add(response.timings.duration);
        check(response, {
          "is status 200": (r) => r.status === 200,
        });
        // console.log(response.body)
        if (response.status === 200) {
          let body = JSON.parse(response.body).data.getZoneByZoneId;
          let categoryArr = body.zoneCategoryStatuses;
  
          if (zone.typeId === "ipm") {
            for (const category of categoryArr) {
              // console.log(zone.id, category.eventSubCategoryId)
              // getZoneGraphData 
              let getZoneGraphData = `
                query {
                  getZoneGraphData(
                        phaseId: "${vars["defaultPhase"]}",
                        zoneId: "${zone.id}",
                        category:"ipm",
                        subCategory: "${category.eventSubCategoryId}",
                        startWeek: 1,
                        endWeek: 30,
                        startYear: 2021,
                        endYear: 2021)
                    {
                      meanPressure{
                            data{
                              date
                              value
                            }
                            projection{
                              date
                              value                  
                            }
                            trend{
                              date
                              value                  
                            }
                            changeInMetricValue
                      }
                      totalCounts{
                            data{
                              date
                              value
                            }
                            projection{
                              date
                              value                  
                            }
                            trend{
                              date
                              value                  
                            }
                            changeInMetricValue
                      }
                      affectedPosts{
                            data{
                              date
                              value
                            }
                            projection{
                              date
                              value                  
                            }
                            trend{
                              date
                              value                  
                            }
                            changeInMetricValue            
                      }
                  }
                }`;
              response = http.post(`${URL}/graphql`, JSON.stringify({ query: getZoneGraphData }), { headers: headers });
              getZoneGraphDataTrend.add(response.timings.duration);
              check(response, {
                "is status 200": (r) => r.status === 200,
              });        
              // console.log(JSON.stringify(response.body))
            };
          };
        };
      };
    };
  });

  group ('Crop Configuration', function() {
    // getCropList
    let getCropList = `
      query {
          getCropList{
  
              crops  {
                  id
                  displayText
                          colors{
                  id
                  displayText
              }
                      cropType  {
                  id
                  displayText
              }
              }
  
              cultivationMethod   	{
                  id
                  displayText
              }
          }
      }`;
    response = http.post(
      `${URL}/graphql`,
      JSON.stringify({ query: getCropList }),
      { headers: headers }
    );
    getCropListTrend.add(response.timings.duration);
    check(response, {
      "is status 200": (r) => r.status === 200,
    });
    // console.log(response.body)
  
    let getAllCropsinPhase = `
      query {
        getAllCropsinPhase
      (    phaseId: "${vars["defaultPhase"]}",
        farmId: "${vars["farmId"]}"){
        id
        crop
        variety
        color
        cultivationMethod
        cultivar
        rowSides{
            rowSeq
            greenhouseSide
            side
        }
      startYear
      startWeek
      endYear
      endWeek
      }
      
    }`;
    response = http.post(
      `${URL}/graphql`,
      JSON.stringify({ query: getAllCropsinPhase }),
      { headers: headers }
    );
    getAllCropsinPhaseTrend.add(response.timings.duration);
    check(response, {
      "is status 200": (r) => r.status === 200,
    });  
    // console.log(response.body)
  });
};
