shot_thumb_paths = [];

function shot_Init()
{
	shot_thumb_paths = [];

	a_SetLabel('Shot');

	a_SetTooltip('Info:\n\
This is Shot asset.\n\
It is designed to view shot sources and results on one page.\n');

	// Get page:
	n_Request({"send":{"getfile":'rules/assets/shot.html'},"func":shot_InitHTML,"info":'get shot.html',"parse":false});
}
function shot_InitHTML( i_data)
{
	$('asset').innerHTML = i_data;

	// Set process buttons commands:
	var path = cgru_PM('/' + RULES.root + g_CurPath());

	cmd = cgru_PM('/cgru/rules/bin/shot_process', true);
	if( ASSET.process )
		cmd = cgru_PM( ASSET.process);

	cmd = cmd + ' -s nuke -r nuke';
	if( ASSET.nuke_template )
		cmd += ' -t ' + cgru_PM(ASSET.nuke_template);

	cmd += ' ' + path;

//console.log( cmd);
	$('shot_nuke_new_btn').setAttribute('cmdexec', JSON.stringify([cmd]));

	cmd = cgru_PM('/cgru/rules/bin/shot_open_latest', true);
	if( ASSET.open_latest )
		cmd = cgru_PM( ASSET.open_latest);

	cmd = cmd + ' -s nuke -e .nk -r nuke';

	cmd += ' ' + path;
//console.log( cmd);
	$('shot_nuke_latest_btn').setAttribute('cmdexec', JSON.stringify([cmd]));

	// Collect walks to show result folders:
	var walk = {};
	walk.paths = [];
	
	if( ASSET.references )
		$('shot_refs_div').style.display = 'block';

	if( ASSET.source )
		$('shot_src_div').style.display = 'block';

	if( ASSET.result )
	{
		walk.result = [];
		for( var r = 0; r < ASSET.result.path.length; r++)
		{
			walk.result.push( walk.paths.length);
			walk.paths.push( ASSET.path + '/' + ASSET.result.path[r]);
		}
		$('shot_results').style.display = 'block';
	}
	if( ASSET.dailies )
	{
		walk.dailies = [];
		for( var r = 0; r < ASSET.dailies.path.length; r++)
		{
			walk.dailies.push( walk.paths.length);
			walk.paths.push( ASSET.path + '/' + ASSET.dailies.path[r]);
		}
		$('shot_dailies').style.display = 'block';
	}

	walk.mtime = RULES.cache_time;
	if( ASSET.cache_time ) walk.mtime = ASSET.cache_time;
	walk.wfunc = shot_Loaded;
	walk.info = 'walk results';

	n_WalkDir( walk);
}

function shot_Loaded( i_data, i_args)
{
	var walk = i_args;
	walk.walks = i_data;
	res_filesviews = [];

	if( ASSET.result )
	{
		var el = $('shot_results');
		el.textContent = '';
		var found = false;
		for( var i = 0; i < walk.result.length; i++)
		{
			var folders = walk.walks[walk.result[i]].folders;
			var files   = walk.walks[walk.result[i]].files;
			var path = walk.paths[walk.result[i]];
			if((( folders == null ) || ( folders.length == 0 )) &&
				(( files  == null ) || (   files.length == 0 ))) continue;

			shot_thumb_paths.push( path);
			res_filesviews.push( new FilesView({"el":el,"path":path,"walk":walk.walks[walk.result[i]],"can_count":true}))
			found = true;
		}

		if( false == found )
			el.textContent = JSON.stringify( ASSET.result.path );
	}

	if( ASSET.dailies )
	{
		var el = $('shot_dailies');
		el.textContent = '';
		var found = false;
		for( var i = 0; i < walk.dailies.length; i++)
		{
			var path = walk.paths[walk.dailies[i]];
			var files = walk.walks[walk.dailies[i]].files;
			var folders = walk.walks[walk.dailies[i]].folders;
			if(( files && files.length ) || ( folders && folders.length ))
			{
				new FilesView({"el":el,"path":path,"walk":walk.walks[walk.dailies[i]]});
				if( shot_thumb_paths.length == 0 )
					shot_thumb_paths.push( path);
				found = true;
			}
		}

		if( false == found )
			el.textContent = JSON.stringify( ASSET.dailies.path );
	}

	shot_MakeThumbnail( shot_thumb_paths);

	// Count frames numbers:
	for( var r = 0; r < res_filesviews.length; r++ )
	{
		var fv = res_filesviews[r];

		if( fv.walk.folders == null ) continue;
		if( fv.walk.folders.length == 0 ) continue;

		// Count frames numner only in the last folder:
		// Find the last folder, but not '.commented':
		var folder = null;
		for( var f = fv.walk.folders.length-1; f >= 0; f--)
		{
			if( fv.walk.folders[f].name.indexOf('.commented') == -1 )
			{
				folder = fv.walk.folders[f];
				break;
			}
		}
		if( folder == null ) continue;

		if( folder.num_files != null )
		{
			// if status frames numbers is undefined, but no update needed, we set status frames number:
			if( r == ( res_filesviews.length - 1 ))
			{
				if(( RULES.status == null ) || ( RULES.status.frames_num == null ))
				{
					st_SetFramesNumber( folder.num_files);
					c_Log('Shot length updated from "' + (fv.path+'/'+folder.name) + '": ' + folder.num_files);
				}
			}

			continue;
		}

		var path = fv.path + '/' + folder.name;

		var args = null;
		// On last files view, we will update status frames number:
		if( r == ( res_filesviews.length - 1 ))
		{
			args = {};
			args.func = shot_FilesCounted;
			args.path = path;
		}

		fv.countFiles( path, args);
	}

	shot_Post();
}

function shot_Post()
{
	g_PostLaunchFunc('shot');
}

function shot_FilesCounted( i_args, i_fv)
{
	var name = c_PathBase( i_args.path);
	for( var f = 0; f < i_fv.walk.folders.length; f++)
	{
		var folder = i_fv.walk.folders[f];
		if( folder.name != name ) continue;
		if( folder.num_files == null ) return;
		st_SetFramesNumber( folder.num_files);
		c_Log('Shot length updated from "' + i_args.path + '": ' + folder.num_files);
		return;
	}
}

function shot_MakeThumbnail()
{
	if( shot_thumb_paths.length == 0 ) return;

	var file = ASSET.path + '/'+RULES.rufolder+'/' + RULES.thumbnail.filename;

	var cache_time = RULES.cache_time;
	if( ASSET.cache_time ) cache_time = ASSET.cache_time;
	if( u_thumbstime[file] && ( c_DT_CurSeconds() - u_thumbstime[file] < cache_time ))
	{
		c_Log('Thumbnail cached '+cache_time+'s: '+file);
		return;
	}

	var input = null;
	for( var i = 0; i < shot_thumb_paths.length; i++ )
	{
		if( input ) input += ',';
		else input = '';
			input += RULES.root + shot_thumb_paths[i];
	}
	var output = RULES.root + file;
	var cmd = RULES.thumbnail.cmd_asset.replace(/@INPUT@/g, input).replace(/@OUTPUT@/g, output);
	cmd += ' -c ' + RULES.thumbnail.colorspace;
	n_Request({"send":{"cmdexec":{"cmds":[cmd]}},"func":u_UpdateThumbnail,"info":'shot thumbnail',"local":true,"wait":false,"parse":true});
}

function shot_ShowRefs()
{
	$('shot_refs_div').style.clear = 'both';
	$('shot_refs_div').style.cssFloat = 'none';
	$('shot_refs_btn').style.display = 'none';
	$('shot_refs').style.display = 'block';
	$('shot_refs').classList.add('waiting');

	var walk = {};
	walk.paths = [];
	for( var i = 0; i < ASSET.references.path.length; i++)
		walk.paths.push( ASSET.path + '/' + ASSET.references.path[i]);

	walk.wfunc = shot_RefsReceived;
	walk.info = 'walk refs';

	n_WalkDir( walk);
}
function shot_RefsReceived( i_data, i_args)
{
	var walk = i_args;
	walk.walks = i_data;

	var el = $('shot_refs');
	el.textContent = '';
	el.classList.remove('waiting');
//console.log( i_data);
	var found = false;
	var not_empty_paths = [];
	for( var i = 0; i < walk.paths.length; i++)
	{
		var folders = walk.walks[i].folders;
		var files = walk.walks[i].files;

		if((( folders == null ) || ( folders.length == 0 )) &&
			((  files == null ) || (   files.length == 0 )))
			 continue;
		not_empty_paths.push( walk.paths[i]);
		new FilesView({"el":el,"path":walk.paths[i],"walk":walk.walks[i],"limits":false})
		found = true;
	}
	if( false == found )
		el.textContent = JSON.stringify( walk.paths );

	if( shot_thumb_paths.length == 0 )
	{
		shot_thumb_paths = not_empty_paths;
		shot_MakeThumbnail();
	}
}

function shot_ScanSources()
{
	$('shot_src_div').style.clear = 'both';
	$('shot_src_div').style.cssFloat = 'none';
	$('shot_src_btn').style.display = 'none';
	$('shot_src').style.display = 'block';
	$('shot_src').classList.add('waiting');

	var paths = [];
	for( var i = 0; i < ASSET.source.path.length; i++)
		paths.push( ASSET.path + '/' + ASSET.source.path[i]);
	n_WalkDir({"paths":paths,"depth":5,"wfunc":shot_SourceReceived,"info":'walk src',"local":true});
}
function shot_SourceReceived( i_data, i_args)
{
	var el = $('shot_src');
	el.textContent = '';
	el.classList.remove('waiting');
	var found = false;
	var not_empty_paths = [];
	for( var i = 0; i < i_data.length; i++)
	{
		var fo_list = [];
		var fi_list = [];
		shot_SourceWalkFind( i_data[i], fo_list, fi_list);
		if( fo_list.length || fi_list.length )
		{
			new FilesView({"el":el,"path":i_args.paths[i],"walk":{"folders":fo_list,"files":fi_list},"limits":false,"thumbs":false,"refresh":false});
			not_empty_paths.push( i_args.paths[i]);
			found = true;
		}
	}

	if( false == found )
		el.textContent = JSON.stringify( ASSET.source.path);

	if( shot_thumb_paths.length == 0 )
	{
		shot_thumb_paths = not_empty_paths;
		shot_MakeThumbnail();
	}
}

function shot_SourceWalkFind( i_walk, o_fo_list, o_fi_list, i_path)
{
//console.log( JSON.stringify( i_walk).replace(/,/g,', '));
//console.log( i_path);
	if( i_walk.files && i_walk.files.length )
	{
		var img_num = 0;
		for( f = 0; f < i_walk.files.length; f++ )
		{
			var name = i_walk.files[f].name;

			if( name.indexOf('.') == 0 ) continue;

			if( c_FileIsMovie( name ))
			{
				if( i_path )
					i_walk.files[f].name = i_path + '/' + i_walk.files[f].name;
				o_fi_list.push( i_walk.files[f]);
			}

			if( false == c_FileIsImage( name )) continue;
			img_num++;
			if( img_num < 2 ) continue;

			if( i_path )
				i_walk.name = i_path;
			else if( i_walk.name == null )
				i_walk.name = '/';

			o_fo_list.push( i_walk);

			break;
		}
	}

	if(( i_walk.folders == null ) || ( i_walk.folders.length == 0 )) return;

	i_walk.folders.sort( c_CompareFiles );
	for( var f = 0; f < i_walk.folders.length; f++)
	{
		var fobj = i_walk.folders[f];
//console.log(JSON.stringify(fobj));
		var path = i_path;
		if( path ) path += '/' + fobj.name;
		else path = fobj.name;

		shot_SourceWalkFind( fobj, o_fo_list, o_fi_list, path);
	}
}

if( ASSETS.shot && ( ASSETS.shot.path == g_CurPath()))
{
	shot_Init();
}

