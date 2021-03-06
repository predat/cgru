# -*- coding: utf-8 -*-
bl_info = {
	"name": "Afanasy Farm Manager",
	"author": "Timur Hairulin <timurhai@gmail.com>",
	"version": (1,),
	"blender": (2, 5, 7),
	"api": 36212,
	"location": "Render > Engine > Afanasy",
	"description": "Submit job to Afanasy to render",
	"warning": "",
	"wiki_url": "",
	"tracker_url": "",
	"category": "Render"
}

import imp
import shutil
import time
import os
import sys

import bpy

from bpy.props import (PointerProperty, StringProperty, BoolProperty,
					   EnumProperty, IntProperty, CollectionProperty)
from bpy.types import Operator, AddonPreferences

# bpy.CURRENT_VERSION = bl_info["version"][0]
# bpy.found_newer_version = False
#bpy.up_to_date = False
#bpy.download_location = 'http://www.sourceforge.net/projects/cgru'

bpy.errors = []


def renderEngine(render_engine):
	"""Missing DocString

	:param render_engine:
	:return:
	"""
	bpy.utils.register_class(render_engine)
	return render_engine

def getListRenderers(scene, context):

	lst = [("BLENDER_RENDER","BLENDER_RENDER",""), ("CYCLES","CYCLES","")]

	prefs = context.user_preferences.addons[__name__].preferences
	if prefs.customEngine != '':
		renderersSplit = prefs.customEngine.split(",")
		for customRen in renderersSplit:
			lst.append((customRen, customRen,""))

	return lst

class OREAddonPreferences(AddonPreferences):
	# this must match the addon name, use '__package__'
	# when defining this in a submodule of a python package.
	# bl_idname = __name__
	bl_idname = __name__

	customEngine = StringProperty(name='Custom Engines',
							description='''Custom Engines. Use "," to split renderers''',
							maxlen=512, default='')

	engineList = EnumProperty(name='Use Engine',
							description='Engine to render scene with.',
							items=getListRenderers)

	def draw(self, context):
		layout = self.layout
		row = layout.row()
		row.label(text="Please, set Exchanges Folder and save Preferences")
		row = layout.row()
		row.prop(self, "engineList")
		layout.prop(self, "customEngine")
		#col.operator("scene.ms_add_lightmap_group", icon='ZOOMIN', text="")
		#col.operator("scene.ms_del_lightmap_group", icon='ZOOMOUT', text="")


class ORESettings(bpy.types.PropertyGroup):
	"""Missing DocString
	"""
	# General:
	jobname = StringProperty(name='Job Name',
							 description='Job Name. Scene name if empty.',
							 maxlen=512, default='')
	engine = StringProperty(name='Use Engine',
							 description='Engine to render scene with.',
							 maxlen=512, default='BLENDER_RENDER')
	fstart = IntProperty(name='Start', description='Start Frame', default=1)
	fend = IntProperty(name='End', description='End Frame', default=11)
	finc = IntProperty(name='By', description='Frames Increment', min=1,
					   default=1)
	fpertask = IntProperty(name='Per Task', description='Frames Per One Task',
						   min=1, default=1)
	pause = BoolProperty(name='Start Job Paused',
						 description='Send job in offline state.', default=0)

	packLinkedObjects = BoolProperty(name='Pack Linked Objects',
						 description='Make Loacal All linked Groups and Objects', default=0)
	relativePaths = BoolProperty(name='Relative Paths',
						 description='Set Relative Paths for all Textures and Objects', default=0)
	packTextures = BoolProperty(name='Pack Textures',
						 description='Pack all Textures into the Blend File.', default=0)

	# Render Settings:
	filepath = StringProperty(name='File Path', description='Set File Path.',
							  maxlen=512, default='')

	# Paramerets:
	priority = IntProperty(name='Priority',
						   description='Job order in user jobs list.', min=-1,
						   max=250, default=-1)
	maxruntasks = IntProperty(name='Max Run Tasks',
							  description='Maximum number of running tasks.',
							  min=-1, max=9999, default=-1)
	dependmask = StringProperty(name='Depend Mask',
								description='Jobs to wait pattern.',
								maxlen=512, default='')
	dependmaskglobal = StringProperty(name='Global Depend',
									  description='All users jobs wait pattern.',
									  maxlen=512, default='')
	hostsmask = StringProperty(name='Hosts Mask',
							   description='Hosts to run pattern.', maxlen=512,
							   default='')
	hostsmaskexclude = StringProperty(name='Exclude Hosts',
									  description='Hosts to ignore pattern.',
									  maxlen=512, default='')

# all panels, except render panel
# Example of wrapping every class 'as is'
from bl_ui import properties_scene

for member in dir(properties_scene):
	subclass = getattr(properties_scene, member)
	try:
		subclass.COMPAT_ENGINES.add('AFANASY_RENDER')
	except:  # TODO: Too broad exception clause
		pass

del properties_scene

from bl_ui import properties_world

for member in dir(properties_world):
	subclass = getattr(properties_world, member)
	try:
		subclass.COMPAT_ENGINES.add('AFANASY_RENDER')
	except:  # TODO: Too broad exception clause
		pass

del properties_world

from bl_ui import properties_material

for member in dir(properties_material):
	subclass = getattr(properties_material, member)
	try:
		subclass.COMPAT_ENGINES.add('AFANASY_RENDER')
	except:  # TODO: Too broad exception clause
		pass

del properties_material

from bl_ui import properties_object

for member in dir(properties_object):
	subclass = getattr(properties_object, member)
	try:
		subclass.COMPAT_ENGINES.add('AFANASY_RENDER')
	except:  # TODO: Too broad exception clause
		pass

del properties_object


class RenderButtonsPanel():
	"""Missing DocString
	"""
	bl_space_type = 'PROPERTIES'
	bl_region_type = 'WINDOW'
	bl_context = "render"


# COMPAT_ENGINES must be defined in each subclass, external engines can add
# themselves here


class RENDER_PT_Afanasy(RenderButtonsPanel, bpy.types.Panel):
	"""Missing DocString
	"""
	bl_label = "Afanasy"
	COMPAT_ENGINES = set(['AFANASY_RENDER'])

	@classmethod
	def poll(cls, context):
		rd = context.scene.render
		return (rd.use_game_engine is False) \
			   and (rd.engine in cls.COMPAT_ENGINES)

	def draw(self, context):
		layout = self.layout
		sce = context.scene
		ore = sce.ore_render

		layout.prop(ore, 'jobname')

		#user_preferences = context.user_preferences
		#addon_prefs = user_preferences.addons[__name__].preferences
		layout.label(text="Renderer: " + ore.engine)
		layout.operator('ore.setrenderer')
		layout.prop(context.user_preferences.addons[__name__].preferences, 'engineList', text='Render Engine')

		layout.separator()
		row = layout.row()
		row.prop(ore, 'fstart')
		row.prop(ore, 'fend')
		row.prop(ore, 'finc')
		row.prop(ore, 'fpertask')

		layout.separator()
		layout.operator('ore.submit')

		layout.separator()
		layout.prop(ore, 'pause')

		layout.separator()
		layout.prop(ore, 'packLinkedObjects')
		layout.prop(ore, 'relativePaths')
		layout.prop(ore, 'packTextures')

		# layout.separator()
		# layout.operator('ore.docs', icon='INFO')


class PARAMETERS_PT_RenderSettings(RenderButtonsPanel, bpy.types.Panel):
	"""Missing DocString
	"""

	bl_label = 'Render Settings'
	COMPAT_ENGINES = set(['AFANASY_RENDER'])

	@classmethod
	def poll(cls, context):
		rd = context.scene.render
		return (rd.use_game_engine == False) and (
			rd.engine in cls.COMPAT_ENGINES)

	def draw(self, context):
		layout = self.layout
		ore = context.scene.ore_render
		layout.prop(ore, 'filepath')


class PARAMETERS_PT_Afanasy(RenderButtonsPanel, bpy.types.Panel):
	"""Missing DocString
	"""

	bl_label = 'Parameters'
	COMPAT_ENGINES = set(['AFANASY_RENDER'])

	@classmethod
	def poll(cls, context):
		rd = context.scene.render
		return (rd.use_game_engine == False) and (
			rd.engine in cls.COMPAT_ENGINES)

	def draw(self, context):
		layout = self.layout
		ore = context.scene.ore_render
		layout.prop(ore, 'priority')
		layout.prop(ore, 'maxruntasks')
		layout.prop(ore, 'dependmask')
		layout.prop(ore, 'dependmaskglobal')
		layout.prop(ore, 'hostsmask')
		layout.prop(ore, 'hostsmaskexclude')


class ORE_SetRenderer(bpy.types.Operator):
	"""Missing DocString
	"""

	bl_idname = "ore.setrenderer"
	bl_label = "Set Renderer"

	def execute(self, context):
		sce = context.scene
		ore = sce.ore_render
		prefs = context.user_preferences.addons[__name__].preferences

		ore.engine = prefs.engineList

		return set(['FINISHED'])


class ORE_Submit(bpy.types.Operator):
	"""Missing DocString
	"""

	bl_idname = "ore.submit"
	bl_label = "Submit Job"

	def execute(self, context):
		sce = context.scene
		ore = sce.ore_render
		rd = context.scene.render
		images = None

		# Calculate temporary scene path:
		scenefile = bpy.data.filepath
		renderscenefile = scenefile + time.strftime('.%m%d-%H%M%S-') + str(
			time.time() - int(time.time()))[2:5] + '.blend'

		# Make all Local and pack all textures and objects
		if ore.packLinkedObjects:
			bpy.ops.object.make_local(type='ALL')
		if ore.relativePaths:
			bpy.ops.file.make_paths_relative()
		if ore.packTextures:
			bpy.ops.file.pack_all()


		# Save Temporary file
		bpy.ops.wm.save_mainfile(filepath=renderscenefile)

		# Get job name:
		jobname = ore.jobname
		# If job name is empty use scene file name:
		if jobname is None or jobname == '':
			jobname = os.path.basename(renderscenefile)
			# Try to cut standart '.blend' extension:
			if len(jobname) > 6:
				if jobname[-6:] == '.blend':
					jobname = jobname[:-6]

		# Get frames settings:
		fstart = ore.fstart
		fend = ore.fend
		finc = ore.finc
		fpertask = ore.fpertask
		# Check frames settings:
		if fpertask < 1:
			fpertask = 1
		if fend < fstart:
			fend = fstart
		# Process images:
		if ore.filepath != '':
			images = ore.filepath

		# Check and add CGRU module in system path:
		cgrupython = os.getenv('CGRU_PYTHON')
		if cgrupython is None or cgrupython == '':
			cgrupython = '/opt/cgru/lib/python'
		if cgrupython not in sys.path:
			sys.path.append(cgrupython)

		# Check and add Afanasy module in system path:
		afpython = os.getenv('AF_PYTHON')
		if afpython is None or afpython == '':
			afpython = '/opt/cgru/afanasy/python'
		if afpython not in sys.path:
			sys.path.append(afpython)

		# Import Afanasy module:
		try:
			af = __import__('af', globals(), locals(), [])
		except:  # TODO: Too broad exception clause
			error = str(sys.exc_info()[1])
			print('Unable to import Afanasy Python module:\n' + error)

			self.report(
				set(['ERROR']),
				'An error occurred while sending submission to Afanasy'
			)
			return set(['CANCELLED'])

		imp.reload(af)  # TODO: imp.reload() does not exist in Python 3.x

		# Create a job:
		job = af.Job(jobname)
		servicename = 'blender'
		block = af.Block(ore.engine, servicename)

		if ore.engine == 'BLENDER_RENDER':
			block.setParser('blender_render')

		if ore.engine == 'CYCLES':
			block.setParser('blender_cycles')

		job.blocks.append(block)
		# Set block command and frame range:
		cmd = 'blender -b "%s"' % renderscenefile
		cmd += ' -E "%s"' % ore.engine
		if images is not None:
			cmd += ' -o "%s"' % images
		cmd += ' -s @#@ -e @#@ -j %d -a' % finc
		block.setCommand(cmd)
		block.setNumeric(fstart, fend, fpertask, finc)
		if images is not None:
			pos = images.find('#')
			if pos > 0:
				images = images[:pos] + '@' + images[pos:]
			pos = images.rfind('#')
			if pos > 0:
				images = images[:pos + 1] + '@' + images[pos + 1:]
			block.setFiles([images])
		# Set job running parameters:
		if ore.maxruntasks > -1:
			job.setMaxRunningTasks(ore.maxruntasks)
		if ore.priority > -1:
			job.setPriority(ore.priority)
		if ore.dependmask != '':
			job.setDependMask(ore.dependmask)
		if ore.dependmaskglobal != '':
			job.setDependMaskGlobal(ore.dependmaskglobal)
		if ore.hostsmask != '':
			job.setHostsMask(ore.hostsmask)
		if ore.hostsmaskexclude != '':
			job.setHostsMaskExclude(ore.hostsmaskexclude)
		if ore.pause:
			job.offLine()
		# Make server to delete temporary file after job deletion:
		job.setCmdPost('deletefiles "%s"' % os.path.abspath(renderscenefile))

		# Print job information:
		job.output(True)

		## Copy scene to render
		#shutil.copy(scenefile, renderscenefile)

		#  Send job to server:
		job.send()

		# open the file again
		bpy.ops.wm.open_mainfile(filepath=scenefile)

		return set(['FINISHED'])


class Afanasy(bpy.types.RenderEngine):
	"""Missing DocString
	"""
	bl_idname = 'AFANASY_RENDER'
	bl_label = "Afanasy"

	def render(self, scene):
		"""Missing DocString

		:param scene:
		:return:
		"""
		print('Render with Afanasy farm manager')


def register():
	"""Missing DocString
	"""
	bpy.utils.register_module(__name__)
	bpy.types.Scene.ore_render = PointerProperty(
		type=ORESettings,
		name='ORE Render',
		description='ORE Render Settings'
	)


def unregister():
	"""Missing DocString
	"""
	bpy.utils.unregister_module(__name__)


if __name__ == "__main__":
	register()
