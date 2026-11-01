import { asset } from './assets';
export const units = [
  {id:'triplex',name:'Unit 01 | Triplex A',bedrooms:5,levels:'117 – 119',apartment:'1,075.66',balcony:'99.03',total:'1,174.69',sourceNode:'1:595',plan:asset('1:594','img2024051413271'),levelNames:['Lower level 117','Mid level 118','Upper level 119']},
  {id:'duplex',name:'Unit 02 | Duplex B1',bedrooms:4,levels:'113 – 114',apartment:'857.07',balcony:'77.95',total:'935.02',sourceNode:'1:645',plan:asset('1:594','img2024051413411'),levelNames:['Lower level 113','Upper level 114']}
] as const;
export const gallery = [
  {image:asset('1:900','imgRectangle129'),alt:'Double-height living room overlooking Dubai Marina'},
  {image:asset('1:900','imgRectangle130'),alt:'Residence terrace overlooking the golf course and Dubai skyline'},
  {image:asset('1:921','imgImage6'),alt:'Private terrace and pool framed by palms'},
  {image:asset('1:821','imgRectangle151'),alt:'Open living and dining spaces in warm natural materials'}
];
export const travel = [
  {time:'5 minutes',places:['Dubai Marina','Marina Mall','Dubai Harbour Beachfront','Emirates Golf Club']},
  {time:'10 minutes',places:['JBR The Beach','Bluewaters','The Palm Jumeirah','Mall of the Emirates']},
  {time:'20 minutes',places:['Palm Jebel Ali','Expo City']},
  {time:'30 minutes',places:['Dubai Intl. Airport','Al Maktoum Intl. Airport']}
];
export const wellbeing = [
  {title:'Interaction',image:asset('1:725','imgRectangle127'),node:'1:725',copy:'It is a true oasis of collaboration, where every corner is imbued with an atmosphere of inspiration and cooperation. Not only ideas but also people meet here, creating an environment where productivity and creativity flourish, along with mutual understanding.'},
  {title:'Balance',image:asset('1:730','imgRectangle127'),node:'1:730',copy:'Discover the true pleasure of a spa vacation in a cozy atmosphere. Refresh yourself in the massage pools, enjoy a deep dive in the swimming pools and relax in the Jacuzzis. Also enjoy a unique relaxation in the infrared, bio and Finnish saunas, as well as in the steam bath.'}
];
export const residenceCopy='The 122-storey tower, comprising of private homes with 2-5 bedrooms, each residence is crafted with meticulous attention to design and materials and complemented by five-star service and amenities in this fabulous location.';
