Stick the sidebar( if contents under side menu are hiding then its should be scrollable independently not with the whole page) of admin portal as teh dashboard page is scrollable the whole sidebar is also scrollable causing the menu item hide due to scroll.
Also make sure that the individual page components like as chat window, or listing pages wherever there are( if overflown or do not comes teh shown space then table data should be scrollable not thw whole page).


the pagination should be smooth and strictly in frontend and backend for all the modules or pages where data are displayed on table that may be the student listing, batch,section or even all kinds f reports and other wherever required be implemented in such a way that  there should be like in frontend:
Showing ... .... to ... of ... entries. then <<  <  1 2 3 ...  >  >>  [page size choose option] in this type where << will route to teh  first available page for that listing page  and >> will route to the last available page for that listing page. and < will route to teh previous page and > will route to teh next page on the listing table the (page size choose should have options (10,20,50,80,120)) and also required the rule like as if there is 22 entries and page size is choosed 10 (default in all) then the pagination should be like:
Showing 1 to 10 of 22 entries. <<  < 1 2 3 >  >> [10] 
this pagination rule should be strictedly implemented for all teh pages where entries are listed in the tables.


Also, the icon for AI Assistant in admin portal is same as of Reports, so,use the relavent one for this.

***************************************************************************************************************
* June 9 11:31 onwards Need to fix:
***************************************************************************************************************

- Need to imporve Knowledge Base.
- Need to Fine tune AI to make it more better and also teh contex aware too
<!-- - Optimizing the validation(error) message throught the system. -->
<!-- - Use progress loader for all backend actions shown in frontend responsibly like as sheet link, otherdata fetch and all. -->
- Add a Faculty Table and also the Add Faculty like as section. And use it while adding the student from add student page in the admin portal
This Faculty is optional for students.
<!-- - Need the Update Routine Feature Allowing the admin to update the set routine. -->
<!-- - Change the Sync Job to the other professional relavent name. -->
<!-- - Optimize the Job Queue to make it look pretty -->
- Allow the student to update their certain details from their portal
- Correct and provide the accurate weekly report to the student in their own portal so that it is displayed in teh student's dashboard correctly
- Add the clickable (cart based navigation to the student's portal like as clicking the Attendence % will route to teh attendance page, bla bla.)
- Confirm the keywords like as Critical Risk, or Extra Ordinary or anything that will describe the different attendance categories like as        severity below 30% Extra Ordinary for 95+ attendance and all from the student service
- Routine Page in student's portal contains more free space so how to cover it..
- Remainder of Today's class in Student's Dashboard is still shown fter 9:00 as its already 10:00 It should update as per teh time
- Our Major aim should be Helping Students in their journy and later Attendance could be our one of the feature not the main module meaning that we will be having such more modules in our system.


In the Profile page: there is Attendance Summary which shows the different summary values of attendance of students. so clicking on each like as overall , Subjects, At Risk, RISK should navigate to the respective page displaying the details of values that describes each of these metrics so that user could be confirm that from where and based on what these values are calculated. aslo it will be trust worthy for them.

<!-- There should be teh deicated buttons like as edit Personal Details page that allows students to update the follwoing details:
gender, blood Group, Registration Number, Admission Date, Faculty, Gurdian Name, Gurdian Contact.
And there should also be view personal details which will display all these along with Name, email and ID but these should not be editable.
Also the Batch and Section for that student should also be shown in personal Details, which allows to view only to this not update. -->

-----------------------------------------
There should be dedicatd config that allows to move the students of particular Batch to shift to the semester like as:
Semester 1,
Semester 2,
Training Semester,
Semester 3,
.
.
Semester 6
Placement Year
And based on this semester, the routine should be displayed to the students. So, the routine should also be linked with the Semester as same batch -same section Students could have different class routine based on the semester.
-----------------------------------------


<!-- Add the skeleton loader while api hits for all pages throught the system so that loading dynamic data looks the system smooth to the user as the page refresh with dynamic data provides very bad experience to the user currently. -->
