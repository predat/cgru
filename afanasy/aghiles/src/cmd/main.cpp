//#include <Python.h>

#include <stdio.h>

#include <QtCore/QCoreApplication>

#include "../libafanasy/environment.h"
#include "../libafanasy/msg.h"
#include "../libafanasy/afattr.h"

#include "../libafnetwork/communications.h"

#include "../libafsql/name_afsql.h"

#define AFOUTPUT
#undef AFOUTPUT
#include "../include/macrooutput.h"

#include "afcmd.h"

bool Verbose;
bool Help;
int Protocol;
std::string ServerName;
int ServerPort;

int main( int argc, char** argv )
{
   QCoreApplication app( argc, argv);
   if ( argc == 1)
   {
      printf("afcmd = '%s'\n", argv[0]);
#ifdef LINUX
      static const int bufsize = 1024;
      char buffer[bufsize];
      char link[] = "/proc/self/exe";
      int linksize = readlink( link, buffer, bufsize);
      buffer[linksize] = '\0';
      printf("%s='%s'\n", link, buffer);
#endif
/*
printf("Msg::SizeHeader       = %d\n", Msg::SizeHeader      );
//printf("Msg::SizeDataMin      = %d\n", Msg::SizeDataMin     );
printf("Msg::SizeBuffer       = %d\n", Msg::SizeBuffer      );
printf("Msg::SizeBufferLimit  = %d\n", Msg::SizeBufferLimit );
printf("Msg::SizeDataMax      = %d\n", Msg::SizeDataMax     );
*/
   }
   Verbose = false;
   Help = false;
   Protocol = AF_UNSPEC;
//
// initialize environment variables

//   Py_InitializeEx(0);
//   uint32_t envflags = af::Environment::AppendPythonPath;
   uint32_t envflags = 0;

   if( argc == 1) envflags = envflags | af::Environment::Verbose;
   af::Environment ENV( envflags, argc, argv);
   if( ENV.isValid() == false ) return 1;
   ServerName = af::Environment::getServerName();
   ServerPort = af::Environment::getServerPort();

   if( af::init( af::InitFarm | (argc == 1 ? af::Verbose : af::NoFlags)) == false) return 1;
   afsql::init();


   int return_value = 0;
//
// initialize command class
   AfCmd afcmd;
//
// generate message from command line arguments
   af::Msg msg;
   if( afcmd.processCommand( argc, argv, msg))
   {
      if( msg.isNull() == false)
      {
         // connect to master
         if( afcmd.connect())
         {
            // send message to master
            if( afcmd.msgSend( msg))
            {
               // recieve message from master if needed
               if( afcmd.isRecieving())
               {
                  af::Msg * answer = afcmd.msgReceive();
                  if( answer)
                  {
                     // printf message information
                     afcmd.msgOutput( *answer);
                  }
                  else  return_value = 1;
               }
            }
            else  return_value = 1;
         }
         else return_value = 1;
      }
   }
   else return_value = 1;

   af::destroy();
//   Py_Finalize();

//   if( argc == 1)
//   {
//      printf("\n");
//      printf("CGRU Version = \"%s\"\n", af::Environment::getVersionCGRU().c_str());
//      printf("Afanasy Revision = \"%d\"\n", af::Environment::getVersionAfanasy());
//      printf("\n");
//      printf("Type \"afcmd h\" for help.\n");
//   }
   return return_value;
}