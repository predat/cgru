ad_initialized = false;
ad_permissions = null;
ad_wnd = null;
ad_wnd_curgroup = null;
ad_wnd_sort_prop = 'id';
ad_wnd_sort_dir = 0;
//ad_wnd_prof = null;

function ad_Init()
{
	if( g_auth_user == null ) return;

	$('profile_button').style.display = 'block';
	$('ad_logout').style.display = 'block';
	$('ad_login').style.display = 'none';

	if( false == g_admin ) return;

	$('admin_button').style.display = 'block';
	$('sidepanel_permissions').style.display = 'block';

	if( localStorage.permissions_opened == "true" ) ad_PermissionsOpen();
	else ad_PermissionsClose();

	ad_initialized = true;
}

function ad_Login()
{
	c_Info('Login');
	if( SERVER.AUTH_RULES )
	{
		localStorage.auth_digest = '';
		new cgru_Dialog({"handle":'ad_LoginGetPassword',"param":'user_id',
			"name":'login',"title":'Login',"info":'Enter User ID'});
	}
	else
		ad_LoginProcess({"realm":cgru_Config.realm});
}
function ad_LoginProcess( i_obj)
{
	n_Request({"send":{"login":i_obj},"func":ad_LoginReceived,"info":'login'});
}
function ad_LoginReceived( i_data)
{
	if( i_data == null ) return;
	if( i_data.error )
	{
		if( SERVER.AUTH_RULES )
		{
			localStorage.auth_user = '';
			localStorage.auth_digest = '';
		}
		c_Error( i_data.error);
		return;
	}
	g_GO('/');
	window.location.reload();
}
function ad_LoginGetPassword( i_user_id)
{
	new cgru_Dialog({"handle":'ad_LoginConstruct',"param":i_user_id,
		"name":'login',"title":'Login',"info":'Enter Password'});
}
function ad_LoginConstruct( i_password, i_user_id)
{
	var digest = ad_ConstructDigest( i_password, i_user_id);
	ad_LoginProcess({"digest":digest});
}
function ad_ConstructDigest( i_password, i_user_id)
{
	var obj = {};
	obj.nc = 1;
	obj.uri = 'cgru';
	obj.qop = 'auth';
	obj.cnonce = Math.random().toString(36).substring(2);
	obj.nonce = SERVER.nonce;

	if( i_user_id == null )
	{
		if( ( localStorage.auth_user          == null ) ||
			( localStorage.auth_user.length   == 0    ) ||
			( localStorage.auth_digest        == null ) ||
			( localStorage.auth_digest.length == 0    ))
			return null;
		i_user_id = localStorage.auth_user;
	}
	else
	{
		localStorage.auth_user = i_user_id;
		localStorage.auth_digest = c_MD5( i_user_id+':'+cgru_Config.realm+':'+i_password);
		//console.log('Digest: '+localStorage.auth_digest);
	}

	obj.response = c_MD5( localStorage.auth_digest+':'+SERVER.nonce+':'+obj.nc+':'+obj.cnonce+':'+obj.qop+':'+c_MD5('POST:'+obj.uri));
	obj.username = i_user_id;

	return obj;
}

function ad_Logout()
{
	c_Info('Logout');

	if( SERVER.AUTH_RULES )
	{
		localStorage.auth_user = '';
		localStorage.auth_digest = '';
		g_GO('/');
		window.location.reload();
		return;
	}
//*
 	var obj = {};
	obj.logout = {"realm":cgru_Config.realm};
	n_Request({"send":obj,"func":ad_LogoutReceived,"info":'logout'});
}
function ad_LogoutReceived( i_data)
{
//c_Log( i_data);
//	*/
///*
	var xhr = new XMLHttpRequest;
	xhr.open('GET', '/', true, 'null', 'null');
	xhr.send('');
	xhr.onreadystatechange = function()
	{
		if (xhr.readyState == 4) { g_GO('/'); window.location.reload(); }
	}
//*/
//c_Log( i_data);
}

function ad_PermissionsProcess()
{
	if( false == ad_initialized ) return;
	if( localStorage.permissions_opened == "true" )
		ad_PermissionsLoad();
}

function ad_PermissionsFinish()
{
	if( false == ad_initialized ) return;
	$('permissions').innerHTML = '';
}

function ad_PermissionsOnClick()
{
	if( $('sidepanel').classList.contains('opened'))
	{
		if( $('sidepanel_permissions').classList.contains('opened'))
			ad_PermissionsClose();
		else
			ad_PermissionsOpen();
	}
	else
	{
		u_SidePanelOpen();
		ad_PermissionsOpen();
	}
}

function ad_PermissionsClose()
{
	$('sidepanel_permissions').classList.remove('opened');
	$('permissions').innerHTML = '';
	localStorage.permissions_opened = "false";
}
function ad_PermissionsOpen()
{
	$('sidepanel_permissions').classList.add('opened');
	localStorage.permissions_opened = "true";
	ad_PermissionsLoad();
}

function ad_PermissionsLoad()
{
	$('permissions').innerHTML = '';

	var path = g_CurPath();
	if( path == null ) return;
	ad_permissions = {};
	ad_permissions.path = RULES.root + path;
	n_Request({"send":{"permissionsget": ad_permissions},"func":ad_PermissionsReceived});
}
function ad_PermissionsReceived( i_data)
{
	ad_permissions = i_data;

	if( ad_permissions == null ) return;
	if( ad_permissions.error )
	{
		c_Error( ad_permissions.error );
		return;
	}
	if(( ad_permissions.users == null ) || ( ad_permissions.groups == null ))
	{
		c_Error('Error loading permissions.');
		return;
	}

	ad_permissions.path = RULES.root + g_CurPath();

	if( ad_permissions.groups.length )
	{
		var el = document.createElement('div');
		$('permissions').appendChild( el);
		el.textContent = 'Groups:';
	}
	for( var i = 0; i < ad_permissions.groups.length; i++)
	{
		var group = ad_permissions.groups[i];
		var el = document.createElement('div');
		$('permissions').appendChild( el);

		if( group != 'admins' )
		{
			var elBtn = document.createElement('div');
			el.appendChild( elBtn);
			elBtn.classList.add('button');
			elBtn.textContent = '-';
			elBtn.m_group_id = group;
			elBtn.ondblclick = function(e){ad_PermissionsRemove('groups', e.currentTarget.m_group_id)};
		}

		var elName = document.createElement('div');
		el.appendChild( elName);
		elName.textContent = group;
	}

	if( ad_permissions.users.length )
	{
		var el = document.createElement('div');
		$('permissions').appendChild( el);
		el.textContent = 'Users:';
	}
	for( var i = 0; i < ad_permissions.users.length; i++)
	{
		var user = ad_permissions.users[i];
		var el = document.createElement('div');
		$('permissions').appendChild( el);

		var elBtn = document.createElement('div');
		el.appendChild( elBtn);
		elBtn.classList.add('button');
		elBtn.textContent = '-';
		elBtn.m_user_id = user;
		elBtn.ondblclick = function(e){ad_PermissionsRemove('users', e.currentTarget.m_user_id)};

		var elName = document.createElement('div');
		el.appendChild( elName);
		elName.textContent = user;
	}
}

function ad_PermissionsGrpAddOnClick()
{
	new cgru_Dialog({"handle":'ad_PermissionsAdd',"param":'groups',"value":'admins',
		"name":'permissions',"title":'Add Group',"info":'Enter Group ID'});
}
function ad_PermissionsUsrAddOnClick()
{
	new cgru_Dialog({"handle":'ad_PermissionsAdd',"param":'users',
		"name":'permssions',"title":'Add User',"info":'Enter User ID'});
}
function ad_PermissionsAdd( i_id, i_type)
{
	i_id = c_Strip( i_id);
	if( i_id.length < 1 )
	{
		c_Error('Empty name.');
		return;
	}
	if( ad_permissions[i_type].indexOf( i_id) != -1 )
	{
		c_Error( i_id+' is already in '+i_type);
		return;
	}
	ad_permissions[i_type].push( i_id);
	n_Request({"send":{"permissionsset":ad_permissions},"func":ad_ChangesFinished,"ad_func":ad_PermissionsLoad,"info":'perm add',"ad_msg":'Permissions '+i_type+' added'});
}
function ad_PermissionsRemove( i_type, i_id)
{
	var index = ad_permissions[i_type].indexOf( i_id);
	if( index == -1 )
	{
		c_Error( i_id+' is not in '+i_type);
		return;
	}
	ad_permissions[i_type].splice( index, 1);
	n_Request({"send":{"permissionsset":ad_permissions},"func":ad_ChangesFinished,"ad_func":ad_PermissionsLoad,"info":'perm rem',"ad_msg":'Permissions '+i_type+' removed'});
}

function ad_PermissionsClearOnClick()
{
	n_Request({"send":{"permissionsclear":{"path":RULES.root+g_CurPath()}},"func":ad_ChangesFinished,"ad_func":ad_PermissionsLoad,"info":'perm clear',"ad_msg":'Permissions cleared'});
}
function ad_ChangesFinished( i_data, i_args)
{
	if(( i_data == null ) || ( i_data.error ))
		c_Error( i_data.error);
	else if( i_args.ad_msg )
		c_Info( i_args.ad_msg );

	if( i_args.ad_func )
		i_args.ad_func();
}
function ad_OpenWindow()
{
	ad_wnd = new cgru_Window({"name":'administrate',"title":'Administrate'});
	ad_wnd.elContent.classList.add('administrate');
	ad_wnd.closeOnEsc = false;

	var elBtnsDiv = document.createElement('div');
	ad_wnd.elContent.appendChild( elBtnsDiv );

	var elBtnRefresh = document.createElement('div');
	elBtnsDiv.appendChild( elBtnRefresh);
	elBtnRefresh.classList.add('button');
	elBtnRefresh.textContent = 'Refresh';
	elBtnRefresh.onclick = ad_WndRefresh;

	var elBtnCreateGrp = document.createElement('div');
	elBtnsDiv.appendChild( elBtnCreateGrp);
	elBtnCreateGrp.classList.add('button');
	elBtnCreateGrp.textContent = 'Create Group';
	elBtnCreateGrp.onclick = ad_CreateGrpOnClick;

	var elBtnDeleteGrp = document.createElement('div');
	elBtnsDiv.appendChild( elBtnDeleteGrp);
	elBtnDeleteGrp.classList.add('button');
	elBtnDeleteGrp.textContent = 'Delete Group';
	elBtnDeleteGrp.onclick = ad_DeleteGrpOnClick;

	var elBtnCreateUsr = document.createElement('div');
	elBtnsDiv.appendChild( elBtnCreateUsr);
	elBtnCreateUsr.classList.add('button');
	elBtnCreateUsr.textContent = 'Create User';
	elBtnCreateUsr.onclick = ad_CreateUserOnClick;

	var elBtnDeleteUsr = document.createElement('div');
	elBtnsDiv.appendChild( elBtnDeleteUsr);
	elBtnDeleteUsr.classList.add('button');
	elBtnDeleteUsr.textContent = 'Delete User';
	elBtnDeleteUsr.onclick = ad_DeleteUserOnClick;

	ad_wnd.elGroups = document.createElement('div');
	ad_wnd.elContent.appendChild( ad_wnd.elGroups);
	ad_wnd.elGroups.classList.add('admin_groups');

	ad_wnd.elUsers = document.createElement('div');
	ad_wnd.elContent.appendChild( ad_wnd.elUsers);
	ad_wnd.elUsers.classList.add('admin_users');

	ad_WndRefresh();
}

function ad_WndDrawGroups()
{
	ad_wnd.elGroups.innerHTML = '';
	ad_wnd.elGrpBnts = [];
	for( var grp in g_groups )
	{
		var el = document.createElement('div');
		ad_wnd.elGroups.appendChild( el);
		ad_wnd.elGrpBnts.push( el);
		el.textContent = grp;
		el.m_group = grp;
		el.onclick = ad_WndGrpOnClick;
		if( grp == ad_wnd_curgroup )
			el.classList.add('selected');
	}
}

function ad_WndDrawUsers()
{
	ad_wnd.elUsers.innerHTML = '';
	ad_wnd.elUsrRows = [];

	var labels = {};
	labels.id = 'ID';
	labels.title = 'Title';
	labels.role = 'Role';
	labels.email = 'Email';
	labels.channels = {}; labels.channels.length = 'Cnls';
	labels.news = {}; labels.news.length = 'News';

	var users = [];
	for( var user in g_users ) users.push( g_users[user]);
		users.sort( function( a, b ) {
			var val_a = a[ad_wnd_sort_prop];
			var val_b = b[ad_wnd_sort_prop];

			var arrays = ['news','channels'];
			if( arrays.indexOf( ad_wnd_sort_prop) != -1 )
			{
				if( val_a ) val_a = val_a.length;
				if( val_b ) val_b = val_b.length;
			}

			if( val_a == null ) val_a = '';
			if( val_b == null ) val_b = '';

			if(( val_a > val_b ) == ad_wnd_sort_dir ) return -1;
			if(( val_a < val_b ) == ad_wnd_sort_dir ) return  1;

			return 0;
		});
	
	var row = 0;
	ad_WndAddUser( ad_wnd.elUsers, labels, row++);
	for( var i = 0; i < users.length; i++ )
		ad_WndAddUser( ad_wnd.elUsers, users[i], row++);
}

function ad_GetType( i_type, i_func)
{
	var request = {};
	request['getall'+i_type] = true;
	n_Request({"send":request,"func":ad_GetTypeReceived,"ad_get_type":i_type,"ad_func":i_func,"info":i_type});
}
function ad_GetTypeReceived( i_data, i_args)
{
	var type = i_args.ad_get_type;

	if( i_data == null )
	{
		ad_wnd.elContent.innerHTML = 'Error getting '+type+'.';
		return;
	}
	if( i_data.error )
	{
		ad_wnd.elContent.innerHTML = 'Error getting '+type+':<br>'+i_data.error;
		return;
	}
	if( i_data[type] == null )
	{
		ad_wnd.elContent.innerHTML = '"'+type+'" are NULL.';
		return;
	}

	if( type == 'users' )
		g_users = i_data[type];
	else if( type == 'groups' )
		g_groups = i_data[type];

	i_args.ad_func();
}

function ad_WndGrpOnClick( i_evt)
{
	for( var i = 0; i < ad_wnd.elGrpBnts.length; i++)
		ad_wnd.elGrpBnts[i].classList.remove('selected');

	var el = i_evt.currentTarget;
	el.classList.add('selected');

	ad_wnd_curgroup = el.m_group;
	for( var i = 0; i < ad_wnd.elUsrRows.length; i++)
	{
		var elU = ad_wnd.elUsrRows[i];
		if( elU.m_user.groups.indexOf( el.m_group) != -1 )
			elU.classList.add('selected');
		else
			elU.classList.remove('selected');
//console.log( elU.m_user.id+' '+elU.m_user.groups+' '+ el.m_group);
	}
}

function ad_WndRefresh()
{
	ad_GetType('groups', ad_WndReceivedGroups);
}
function ad_WndReceivedGroups()
{
	ad_GetType('users', ad_WndReceivedUsers);
}
function ad_WndReceivedUsers()
{
	for( var u in g_users )
	{
//window.console.log(user);
		g_users[u].groups = [];
		for( var grp in g_groups )
			if( g_groups[grp].indexOf( g_users[u].id ) != -1 )
				g_users[u].groups.push( grp);
	}

	if( ad_wnd == null ) return;

	ad_WndDrawGroups();
	ad_WndDrawUsers();
}

function ad_WndAddUser( i_el, i_user, i_row)
{
	var el = document.createElement('div');
	i_el.appendChild(el);

	if( i_row )
	{
		ad_wnd.elUsrRows.push( el);
		el.m_user = i_user;
		el.classList.add('user');
		if( i_row % 2) el.style.backgroundColor = 'rgba(255,255,255,.1)';
		else el.style.backgroundColor = 'rgba(0,0,0,.1)';
		if( i_user.groups.indexOf( ad_wnd_curgroup ) != -1 )
			el.classList.add('selected');
	}
	else
	{
		el.style.backgroundColor = 'rgba(0,0,0,.2)';
		el.style.cursor = 'pointer';
	}

	var elGroup = document.createElement('div');
	el.appendChild( elGroup);
	elGroup.style.width = '20px';
	elGroup.textContent = 'G';
	elGroup.title = 'Double click edit group';
	elGroup.style.cursor = 'pointer';
	elGroup.m_user = i_user;
	if( i_row ) elGroup.ondblclick = function(e){ad_WndUserGroupOnCkick( e.currentTarget.m_user);};

	var elName = document.createElement('div');
	el.appendChild( elName);
	elName.style.width = '100px';
	elName.textContent = i_user.id;
	if( i_row == 0 ) elName.onclick = function(e) { ad_WndSortUsers('id'); };

	var elTitle = document.createElement('div');
	el.appendChild( elTitle);
	elTitle.style.width = '190px';
	elTitle.textContent = i_user.title;
	elTitle.m_user_id = i_user.id;
	elTitle.title = 'Double click edit title';
	if( i_row ) elTitle.ondblclick = function(e){ad_ChangeTitleOnCkick(e.currentTarget.m_user_id);};
	else elTitle.onclick = function(e) { ad_WndSortUsers('title'); }

	var elRole = document.createElement('div');
	el.appendChild( elRole);
	elRole.style.width = '100px';
	elRole.textContent = i_user.role;
	elRole.m_user_id = i_user.id;
	elRole.title = 'Double click edit role';
	if( i_row ) elRole.ondblclick = function(e){ad_ChangeRoleOnCkick(e.currentTarget.m_user_id);};
	else elRole.onclick = function(e) { ad_WndSortUsers('role'); }

	var elEmail = document.createElement('div');
	el.appendChild( elEmail);
	elEmail.style.width = '200px';
	elEmail.textContent = i_user.email;
	elEmail.m_user_id = i_user.id;
	elEmail.title = 'Double click edit email';
	if( i_row ) elEmail.ondblclick = function(e){ad_ChangeEmailOnCkick(e.currentTarget.m_user_id);};
	else elEmail.onclick = function(e) { ad_WndSortUsers('email'); };

	var elPasswd = document.createElement('div');
	el.appendChild( elPasswd);
	elPasswd.style.width = '50px';
	if( i_row ) elPasswd.textContent = '***';
	else elPasswd.textContent = 'Pass';
	elPasswd.m_user_id = i_user.id;
	elPasswd.title = 'Double click to edit password';
	if( i_row ) elPasswd.ondblclick = function(e){ad_SetPasswordDialog( e.currentTarget.m_user_id);};

	var elChannels = document.createElement('div');
	el.appendChild( elChannels);
	elChannels.style.width = '50px';
	if( i_user.channels )
		elChannels.textContent = i_user.channels.length;
	if( i_user.channels && i_user.channels.length )
	{
		var channels = '';
		for( var i = 0; i < i_user.channels.length; i++)
		 channels += i_user.channels[i].id+'\n';
		elChannels.title = channels;
	}
	if( i_row == 0 ) elChannels.onclick = function(e) { ad_WndSortUsers('channels'); };

	var elNews = document.createElement('div');
	el.appendChild( elNews);
	if( i_user.news )
		elNews.textContent = i_user.news.length;
	elNews.style.width = '50px';
	if( i_row == 0 ) elNews.onclick = function(e) { ad_WndSortUsers('news'); };

	var elCTime = document.createElement('div');
	el.appendChild( elCTime);
	if( i_row ) elCTime.textContent = c_DT_StrFromSec( i_user.ctime).substr(4,11);
	else elCTime.textContent = 'Created';
	elCTime.style.width = '140px';
	if( i_row == 0 ) elCTime.onclick = function(e) { ad_WndSortUsers('ctime'); };

	var elRTime = document.createElement('div');
	el.appendChild( elRTime);
	if( i_row ) elRTime.textContent = c_DT_StrFromSec( i_user.rtime).substr(4);
	else elRTime.textContent = 'Entered';
	elRTime.style.width = '180px';
	if( i_row == 0 ) elRTime.onclick = function(e) { ad_WndSortUsers('rtime'); };
}

function ad_WndSortUsers( i_prop)
{
	if( ad_wnd_sort_prop == i_prop )
		ad_wnd_sort_dir = 1 - ad_wnd_sort_dir;
	else
		ad_wnd_sort_prop = i_prop;
	ad_WndDrawUsers();
}

function ad_CreateGrpOnClick()
{
//	new cgru_Dialog( window, window, 'ad_CreateGroup', null, 'str', '', 'users', 'Create Group', 'Enter Group Name');
	new cgru_Dialog({"handle":'ad_CreateGroup',
		"name":'users',"title":'Create Group',"info":'Enter Group Name'});
}
function ad_CreateGroup( i_group)
{
	if( g_groups[i_group] != null )
	{
		c_Error('Group "'+i_group+'" already exists.');
		return;
	}
	g_groups[i_group] = {};
	ad_WriteGroups();
}

function ad_DeleteGrpOnClick()
{
//	new cgru_Dialog( window, window, 'ad_DeleteGroup', null, 'str', '', 'users', 'Delete Group', 'Enter Group Name');
	new cgru_Dialog({"handle":'ad_DeleteGroup',
		"name":'users',"title":'Delete Group',"info":'Enter Group Name'});
}
function ad_DeleteGroup( i_group)
{
	if( g_groups[i_group] == null )
	{
		c_Error('Group "'+i_group+'" does not exist.');
		return;
	}
	delete g_groups[i_group];
	ad_WriteGroups();
}

function ad_WndUserGroupOnCkick( i_user)
{
	var grp = ad_wnd_curgroup;
	if( grp == null )
	{
		c_Error('No group selected');
		return;
	}
	for( var i = 0; i < ad_wnd.elGrpBnts.length; i++)
		if( ad_wnd.elGrpBnts[i].classList.contains('selected'))
			grp = ad_wnd.elGrpBnts[i].m_group;

	if( i_user.groups.indexOf( grp ) == -1  )
	{
		if( g_groups[grp].indexOf( i_user.id ) != -1 )
		{
			c_Error('User '+i_user.id+' already in group '+grp);
			return;
		}
		g_groups[grp].push( i_user.id );
	}
	else
	{
		if( g_groups[grp].indexOf( i_user.id ) == -1 )
		{
			c_Error('User '+i_user.id+' is not in group '+grp);
			return;
		}
		g_groups[grp].splice( g_groups[grp].indexOf( i_user.id ), 1);
	}

	ad_WriteGroups();
}
function ad_WriteGroups()
{
	n_Request({"send":{"writegroups":g_groups},"func":ad_ChangesFinished,"ad_func":ad_WndRefresh,"ad_msg":'Grounps written.',"info":'writegroups'});
}
function ad_ChangeTitleOnCkick( i_user_id)
{
	new cgru_Dialog({"handle":'ad_ChangeTitle',"param":i_user_id,"value":g_users[i_user_id].title,
		"name":'users',"title":'Change Title',"info":'Enter new title for ' + c_GetUserTitle(i_user_id)});
}
function ad_ChangeTitle( i_title, i_user_id)
{
	ad_SaveUser({"id":i_user_id,"title":i_title}, ad_WndRefresh);
}
function ad_ChangeRoleOnCkick( i_user_id)
{
	new cgru_Dialog({"handle":'ad_ChangeRole',"param":i_user_id,"value":g_users[i_user_id].role,
		"name":'users',"title":'Change Role',"info":'Enter new role for ' + c_GetUserTitle(i_user_id)});
}
function ad_ChangeRole( i_role, i_user_id)
{
	ad_SaveUser({"id":i_user_id,"role":i_role}, ad_WndRefresh);
}
function ad_ChangeEmailOnCkick( i_user_id)
{
	new cgru_Dialog({"handle":'ad_ChangeEmail',"param":i_user_id,"value":g_users[i_user_id].email,
		"name":'users',"title":'Change Email',"info":'Enter new email for ' + c_GetUserTitle(i_user_id)});
}
function ad_ChangeEmail( i_email, i_user_id)
{
	ad_SaveUser({"id":i_user_id,"email":i_email}, ad_WndRefresh);
}
function ad_SaveUser( i_user, i_func)
{
	if( i_user == null ) i_user = g_auth_user;
	
	var obj = {};
	obj.add = true;
	obj.object = i_user;
	obj.file = 'users/' + i_user.id + '.json';

	n_Request({"send":{"editobj":obj},"func":ad_ChangesFinished,"ad_func":i_func,"ad_msg":'User '+i_user.id+' saved'});
}

function ad_CreateUserOnClick()
{
//	new cgru_Dialog( window, window, 'ad_CreateUser', null, 'str', '', 'users', 'Create New User', 'Enter User Login Name');
	new cgru_Dialog({"handle":'ad_CreateUser',
		"name":'users',"title":'Create New User',"info":'Enter User Login Name'});
}
function ad_CreateUser( i_user_id)
{
	var user = {};
	user.id = i_user_id;
	user.channels = [];
	user.news = [];
	user.ctime = Math.round((new Date()).valueOf()/1000);

	var obj = {};
	obj.add = true;
	obj.object = user;
	obj.file = 'users/' + i_user_id + '.json';

	n_Request({"send":{"editobj":obj},"func":ad_ChangesFinished,"ad_func":ad_WndRefresh,"ad_msg":'User "'+i_user_id+'" created.'});
}

function ad_DeleteUserOnClick()
{
	new cgru_Dialog({"handle":'ad_DeleteUser',
		"name":'users',"title":'Delete User',"info":'Enter User Login Name'});
}
function ad_DeleteUser( i_user_id)
{
	n_Request({"send":{"deleteuser":i_user_id},"func":ad_ChangesFinished,"ad_func":ad_WndRefresh,"ad_msg":'User "'+i_user_id+'" deleted.'});
}

function ad_SetPasswordDialog( i_user_id)
{
	var pw = '';
	for( var i = 0; i < 10; i ++) pw += Math.random().toString(36).substring(2);
	pw = btoa( pw).substr( 0, 60);
//	new cgru_Dialog( window, window, 'ad_SetPassword', i_user_id, 'str', pw, 'password', 'Set Password', 'Enter New Password');
	new cgru_Dialog({"handle":'ad_SetPassword',"param":i_user_id,"value":pw,
		"name":'password',"title":'Set Password',"info":'Enter new password for ' + c_GetUserTitle(i_user_id)});
}
function ad_SetPassword( i_passwd, i_user_id)
{
	var email = g_users[i_user_id].email;
	if( email && email.length )
	{
		var subject = 'RULES Password';
		var body = window.location.protocol + '//' + window.location.host + window.location.pathname;
		body = '<a href="'+body+'" target="_blank">'+body+'</a>';
		body += ' password for ';
		if( g_users[i_user_id].title )
			body += g_users[i_user_id].title+' ['+i_user_id+']';
		else
			body += i_user_id;
		body += ' is set to:';
		body += '<br><br>';
		body += i_passwd;
		body += '<br><br>';
		body += 'Login name: '+i_user_id;

		n_SendMail( email, subject, body);
	}

	var digest = c_MD5( i_user_id + ':'+cgru_Config.realm+':' + i_passwd);
	digest = i_user_id + ':'+cgru_Config.realm+':' + digest;

	var obj = {};
	obj.send = {"htdigest":{"user":i_user_id,"digest":digest}};
	obj.encode = SERVER.php_version >= "5.3";
	obj.func = ad_SetPasswordFinished;
	n_Request(obj);
}
function ad_SetPasswordFinished( i_data)
{
	if(( i_data == null ) || ( i_data.error ))
	{
		c_Error( i_data.error);
		return;
	}

	if( i_data.status ) c_Info( i_data.status);
}


ad_prof_props = [];
ad_prof_props.id     = {"disabled":true,"lwidth":'170px',"label":'ID'};
ad_prof_props.title  = {"disabled":true,"lwidth":'170px'};
ad_prof_props.role   = {"disabled":true,"lwidth":'170px'};
ad_prof_props.avatar = {};
ad_prof_props.email  = {"width":'70%'};
ad_prof_props.email_news = {"width":'30%',"bool":false};

function ad_ProfileOpen()
{
	if( g_auth_user == null )
	{
		c_Error('No authenticated user found.');
		return;
	}

	var wnd = new cgru_Window({"name":'profile',"title":'My Profile'});
	wnd.elContent.classList.add('profile');

//	wnd.closeOnEsc = false;
//	ad_wnd_prof = wnd;
//	ad_ProfileDrawa();
//}
//function ad_ProfileDraw()
//{
//	var wnd = ad_wnd_prof;
//	wnd.elContent.innerHTML = '';

	var avatar = c_GetAvatar();
	if( avatar )
	{
		var el = document.createElement('img');
		wnd.elContent.appendChild( el);
		el.classList.add('avatar');
		el.src = avatar;
	}

	gui_Create( wnd.elContent, ad_prof_props, [g_auth_user]);

	var elBtns = document.createElement('div');
	wnd.elContent.appendChild( elBtns);
	elBtns.style.clear = 'both';

	var elSend = document.createElement('div');
	elBtns.appendChild( elSend);
	elSend.textContent = 'Save';
	elSend.classList.add('button');
	elSend.onclick = function(e){ ad_ProfileSave( e.currentTarget.m_wnd);}
	elSend.m_wnd = wnd;

	var elSend = document.createElement('div');
	elBtns.appendChild( elSend);
	elSend.textContent = 'Cancel';
	elSend.classList.add('button');
	elSend.onclick = function(e){ e.currentTarget.m_wnd.destroy();}
	elSend.m_wnd = wnd;
}

function ad_ProfileSave( i_wnd)
{
	var params = gui_GetParams( i_wnd.elContent, ad_prof_props);
	for( p in params ) g_auth_user[p] = params[p];
	ad_SaveUser();
	i_wnd.destroy();
}
/*
	for( var i = 0; i < ad_prof_props.length; i++ )
	{
		var prop = ad_prof_props[i];

		var el = document.createElement('div');
		wnd.elContent.appendChild( el);

		var elLabel = document.createElement('div');
		el.appendChild( elLabel);
		elLabel.textContent = prop.label;
		elLabel.classList.add('label');

		if( prop.edit )
		{
			var elEdit = document.createElement('div');
			el.appendChild( elEdit);
			elEdit.textContent = 'Edit';
			elEdit.classList.add('button');
			elEdit.m_prop = prop;
			elEdit.onclick = ad_ProfileEditPropOnClick;
		}

		var elProp = document.createElement('div');
		el.appendChild( elProp);
		elProp.textContent = g_auth_user[prop.name];
		elProp.classList.add('prop');
	}
}
function ad_ProfileEditPropOnClick( i_evt)
{
	var prop = i_evt.currentTarget.m_prop;
//	new cgru_Dialog( window, window, 'ad_ProfileEditProp', prop.name, 'str', g_auth_user[prop.name], 'users', 'Change '+prop.label, 'Enter New Value');
	new cgru_Dialog({"handle":'ad_ProfileEditProp',"param":prop.name,"value":g_auth_user[prop.name],
		"name":'users',"title":'Change '+prop.label,"info":'Enter New Value'});
}
function ad_ProfileEditProp( i_value, i_prop)
{
	g_auth_user[i_prop] = i_value;
	ad_SaveUserProp( g_auth_user.id, i_prop, i_value)
	ad_ProfileDraw();
}
*/

